'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import BoxscoreModal from '@/components/BoxscoreModal'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT, teamAccent } from '@/lib/teams'
import type { WinProbPoint } from '@/app/api/win-probability/[gameId]/route'
import type { PostseasonData, HSGame, HSSeries } from '@/lib/holland-series'

const WinProbChart = dynamic(() => import('@/components/WinProbChart'), { ssr: false })

// Postseason runs late Aug / Sep (CEST = UTC+2): a fixed offset gives a correct
// instant for every viewer regardless of their timezone.
function feedDate(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(`${iso.replace(' ', 'T')}+02:00`)
  return isNaN(d.getTime()) ? null : d
}
const fmtDateTime = (iso: string | null) => {
  const d = feedDate(iso)
  if (!d) return 'TBD'
  return d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ targetISO }: { targetISO: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const diff = Math.max(0, (feedDate(targetISO)?.getTime() ?? 0) - now)
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
  const unit = (v: number, l: string) => (
    <div className="flex flex-col items-center">
      <span className="font-display font-800 text-2xl md:text-3xl text-white tabular-nums">{String(v).padStart(2, '0')}</span>
      <span className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest">{l}</span>
    </div>
  )
  return <div className="flex items-center gap-4">{d > 0 && unit(d, 'Days')}{unit(h, 'Hrs')}{unit(m, 'Min')}{unit(s, 'Sec')}</div>
}

// ── Team logo + seed ──────────────────────────────────────────────────────────
function TeamBadge({ teamId, seed, size = 40 }: { teamId: string; seed?: number; size?: number }) {
  return (
    <div className="relative shrink-0">
      <div className="rounded-xl flex items-center justify-center p-1.5" style={{ backgroundColor: TEAM_COLORS[teamId] ?? '#1e335a', width: size, height: size }}>
        {TEAM_LOGOS[teamId]
          ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={size - 12} height={size - 12} className="object-contain w-full h-full" />
          : <span className="font-display font-800 text-white text-xs">{TEAM_SHORT[teamId]}</span>}
      </div>
      {seed != null && <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-[var(--card)] border border-[var(--border)] flex items-center justify-center font-display font-800 text-[10px] text-white">{seed}</span>}
    </div>
  )
}

// ── Matchup card (a series) ───────────────────────────────────────────────────
function TeamLine({ teamId, seed, wins, winner, dim, big }: { teamId: string; seed?: number; wins: number; winner: boolean; dim: boolean; big?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${winner ? 'bg-[var(--accent)]/12' : ''}`}>
      <TeamBadge teamId={teamId} seed={seed} size={big ? 44 : 34} />
      <span className={`font-display font-800 uppercase flex-1 min-w-0 truncate ${big ? 'text-base' : 'text-sm'} ${dim ? 'text-[var(--muted)]' : 'text-white'}`}>{TEAM_NAMES[teamId] ?? teamId}</span>
      <span className={`font-display font-800 tabular-nums ${big ? 'text-2xl' : 'text-xl'}`} style={{ color: winner ? teamAccent(teamId) : dim ? 'var(--muted)' : '#fff' }}>{wins}</span>
    </div>
  )
}

function MatchupCard({ series, seeds, big, onOpen, live }: { series: HSSeries; seeds: Record<string, number>; big?: boolean; onOpen: () => void; live?: boolean }) {
  const { teamA, teamB, winsA, winsB, clinchedBy, bestOf } = series
  const decided = !!clinchedBy
  return (
    <button onClick={onOpen} className={`w-full text-left bg-[var(--card)] border rounded-2xl p-3 transition-colors hover:border-[var(--accent)] ${big ? 'border-[var(--accent)]/40' : 'border-[var(--border)]'}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{series.label}</span>
        {live
          ? <span className="inline-flex items-center gap-1 font-display font-800 text-[10px] text-[var(--accent)] uppercase"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />Live</span>
          : <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Bo{bestOf}</span>}
      </div>
      <div className="space-y-1">
        <TeamLine teamId={teamA} seed={seeds[teamA]} wins={winsA} winner={clinchedBy === teamA} dim={decided && clinchedBy !== teamA} big={big} />
        <TeamLine teamId={teamB} seed={seeds[teamB]} wins={winsB} winner={clinchedBy === teamB} dim={decided && clinchedBy !== teamB} big={big} />
      </div>
      <p className="text-center font-display font-700 text-[10px] uppercase tracking-widest mt-2.5" style={{ color: decided ? teamAccent(clinchedBy!) : 'var(--muted)' }}>
        {decided ? `${TEAM_SHORT[clinchedBy!]} advance` : 'View series →'}
      </p>
    </button>
  )
}

// ── Game row (inside the detail) ──────────────────────────────────────────────
function GameRow({ game, index, onOpenBox }: { game: HSGame; index: number; onOpenBox: (g: HSGame) => void }) {
  const [wp, setWp] = useState<WinProbPoint[] | null>(null)
  const [wpOpen, setWpOpen] = useState(false)
  const hasResult = game.status !== 'scheduled' && game.homeScore != null && game.awayScore != null
  const realId = !game.id.startsWith('final-g')
  const toggleWp = async () => {
    const n = !wpOpen; setWpOpen(n)
    if (n && !wp) { try { const r = await fetch(`/api/win-probability/${game.id}`); setWp((await r.json()).points ?? []) } catch { setWp([]) } }
  }
  const wHome = hasResult && (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const wAway = hasResult && (game.awayScore ?? 0) > (game.homeScore ?? 0)
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="shrink-0 w-24">
          <p className="font-display font-800 text-xs text-white uppercase">Game {game.gameNumber ?? index + 1}{game.ifNecessary ? '*' : ''}</p>
          {game.status === 'live'
            ? <span className="inline-flex items-center gap-1 font-display font-800 text-[10px] text-[var(--accent)] uppercase"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />Live</span>
            : <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase leading-tight">{game.status === 'final' ? 'Final' : fmtDateTime(game.startISO)}</p>}
          {game.location && game.status !== 'final' && <p className="font-display font-700 text-[9px] text-[var(--muted)]/70 uppercase">{game.location}</p>}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {[{ id: game.awayId, sc: game.awayScore, w: wAway }, { id: game.homeId, sc: game.homeScore, w: wHome }].map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <TeamBadge teamId={r.id} size={22} />
              <span className={`font-display font-800 uppercase text-xs flex-1 truncate ${r.w ? 'text-white' : 'text-[var(--muted)]'}`}>{TEAM_NAMES[r.id] ?? r.id}</span>
              {hasResult && <span className={`font-display font-800 tabular-nums text-sm ${r.w ? 'text-white' : 'text-[var(--muted)]'}`}>{r.sc}</span>}
            </div>
          ))}
        </div>
        {hasResult && realId && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button onClick={() => onOpenBox(game)} className="font-display font-800 text-[10px] uppercase tracking-wider text-white bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--accent)] px-2.5 py-1 rounded-lg transition-colors">Box</button>
            <button onClick={toggleWp} className="font-display font-700 text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)]">{wpOpen ? 'Hide WP' : 'Win prob.'}</button>
          </div>
        )}
      </div>
      {wpOpen && (wp && wp.length >= 2
        ? <WinProbChart points={wp} homeId={game.homeId} awayId={game.awayId} homeColor={teamAccent(game.homeId)} awayColor={teamAccent(game.awayId)} />
        : <p className="px-4 pb-3 font-display font-700 text-[var(--muted)] text-xs uppercase">No play-by-play data</p>)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PostseasonBracket({ initial }: { initial: PostseasonData }) {
  const [data, setData] = useState(initial)
  const [openSeries, setOpenSeries] = useState<HSSeries | null>(null)
  const [box, setBox] = useState<HSGame | null>(null)

  const refresh = useCallback(async () => {
    try { const r = await fetch('/api/holland-series', { cache: 'no-store' }); if (r.ok) setData(await r.json()) } catch { /* keep */ }
  }, [])
  useEffect(() => {
    const t = setInterval(refresh, 30_000)
    const onVis = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh])

  const { semifinals, final, finalScheduled, seeds } = data
  const isLive = (s: HSSeries | null) => !!s?.games.some(g => g.status === 'live')
  const nextGame = final && !final.clinchedBy ? (final.nextGame && final.nextGame.status === 'scheduled' ? final.nextGame : null) : null

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {box && <BoxscoreModal gameId={box.id} awayId={box.awayId} homeId={box.homeId} awayScore={box.awayScore} homeScore={box.homeScore} gameDate={fmtDateTime(box.startISO)} onClose={() => setBox(null)} />}

      {/* Series detail modal */}
      {openSeries && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpenSeries(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-800 italic text-xl uppercase text-white">{openSeries.label}</p>
              <button onClick={() => setOpenSeries(null)} className="font-display font-800 text-[var(--muted)] hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="flex flex-col items-center gap-1"><TeamBadge teamId={openSeries.teamA} seed={seeds[openSeries.teamA]} size={48} /><span className="font-display font-800 text-xs uppercase text-white">{TEAM_SHORT[openSeries.teamA]}</span></div>
              <div className="flex items-center gap-2">
                <span className="font-display font-800 text-4xl tabular-nums text-white">{openSeries.winsA}</span>
                <span className="font-display font-700 text-[var(--muted)]">–</span>
                <span className="font-display font-800 text-4xl tabular-nums text-white">{openSeries.winsB}</span>
              </div>
              <div className="flex flex-col items-center gap-1"><TeamBadge teamId={openSeries.teamB} seed={seeds[openSeries.teamB]} size={48} /><span className="font-display font-800 text-xs uppercase text-white">{TEAM_SHORT[openSeries.teamB]}</span></div>
            </div>
            <div className="space-y-2">
              {openSeries.games.map((g, i) => <GameRow key={g.id} game={g} index={i} onOpenBox={setBox} />)}
            </div>
            {openSeries.games.some(g => g.ifNecessary) && <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-wider mt-3">* if necessary</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white"><strong>Postseason</strong><span className="text-[var(--accent)]"> Bracket</span></h1>
      </div>

      {/* Champion banner */}
      {final?.clinchedBy && (
        <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent)]/10 p-5 mb-6 flex items-center justify-center gap-3">
          <TeamBadge teamId={final.clinchedBy} size={44} />
          <p className="font-display font-800 italic text-2xl uppercase text-white">🏆 {TEAM_NAMES[final.clinchedBy]} — Champions</p>
        </div>
      )}

      {/* Bracket */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr_1fr] gap-4 lg:gap-3 items-center">
        {/* Semifinal A */}
        <div className="lg:order-1">
          {semifinals[0]
            ? <MatchupCard series={semifinals[0]} seeds={seeds} onOpen={() => setOpenSeries(semifinals[0])} live={isLive(semifinals[0])} />
            : <EmptyCard label="Semifinal" />}
        </div>

        {/* Final (center) */}
        <div className="lg:order-2">
          <p className="text-center font-display font-800 italic text-lg uppercase text-white mb-2">Holland Series</p>
          {final
            ? <>
                <MatchupCard series={final} seeds={seeds} big onOpen={() => setOpenSeries(final)} live={isLive(final)} />
                {!final.clinchedBy && (
                  <div className="flex flex-col items-center gap-2 mt-3">
                    {isLive(final)
                      ? <span className="inline-flex items-center gap-2 font-display font-800 text-xs uppercase tracking-widest text-[var(--accent)]"><span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />Game in progress</span>
                      : nextGame
                        ? <>
                            <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{finalScheduled ? 'Game 1' : 'Next game'} · {fmtDateTime(nextGame.startISO)}{nextGame.location ? ` · ${nextGame.location}` : ''}</p>
                            <Countdown targetISO={nextGame.startISO!} />
                          </>
                        : null}
                  </div>
                )}
              </>
            : <EmptyCard label="Finalists TBD" />}
        </div>

        {/* Semifinal B */}
        <div className="lg:order-3">
          {semifinals[1]
            ? <MatchupCard series={semifinals[1]} seeds={seeds} onOpen={() => setOpenSeries(semifinals[1])} live={isLive(semifinals[1])} />
            : <EmptyCard label="Semifinal" />}
        </div>
      </div>

      <p className="text-center font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-6">Tap a matchup for game-by-game scores, boxscores & win probability</p>
    </div>
  )
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl p-6 text-center">
      <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest">{label}</p>
    </div>
  )
}
