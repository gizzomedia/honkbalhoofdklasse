'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import BoxscoreModal from '@/components/BoxscoreModal'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT, teamAccent } from '@/lib/teams'
import type { WinProbPoint } from '@/app/api/win-probability/[gameId]/route'
import type { PostseasonData, HSGame, HSSeries } from '@/lib/holland-series'

const WinProbChart = dynamic(() => import('@/components/WinProbChart'), { ssr: false })

// Postseason runs late Aug / Sep (CEST = UTC+2): a fixed offset gives a correct instant for every viewer.
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
      <span className="font-display font-800 text-2xl text-white tabular-nums">{String(v).padStart(2, '0')}</span>
      <span className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest">{l}</span>
    </div>
  )
  return <div className="flex items-center gap-4">{d > 0 && unit(d, 'Days')}{unit(h, 'Hrs')}{unit(m, 'Min')}{unit(s, 'Sec')}</div>
}

// ── Team logo (used in detail) ────────────────────────────────────────────────
function TeamBadge({ teamId, seed, size = 40 }: { teamId: string; seed?: number; size?: number }) {
  return (
    <div className="relative shrink-0">
      <div className="rounded-xl flex items-center justify-center p-1.5" style={{ backgroundColor: TEAM_COLORS[teamId] ?? '#1e335a', width: size, height: size }}>
        {TEAM_LOGOS[teamId] ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={size - 12} height={size - 12} className="object-contain w-full h-full" /> : <span className="font-display font-800 text-white text-xs">{TEAM_SHORT[teamId]}</span>}
      </div>
      {seed != null && <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-[var(--card)] border border-[var(--border)] flex items-center justify-center font-display font-800 text-[10px] text-white">{seed}</span>}
    </div>
  )
}

// ── Bracket card ──────────────────────────────────────────────────────────────
type CardState = 'win' | 'loss' | 'neutral'
function BracketCard({ teamId, seed, wins, showWins, state, onClick }: { teamId: string | null; seed?: number; wins?: number; showWins?: boolean; state: CardState; onClick?: () => void }) {
  const color = teamId ? (TEAM_COLORS[teamId] ?? '#1e335a') : '#232833'
  return (
    <button onClick={onClick} disabled={!teamId || !onClick}
      className={`relative w-full h-full flex flex-col rounded-md overflow-hidden transition-transform ${onClick && teamId ? 'hover:scale-[1.03]' : ''} ${state === 'loss' ? 'opacity-65' : ''}`}
      style={{ backgroundColor: color, boxShadow: state === 'win' ? `0 0 0 2px ${teamAccent(teamId!)}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
      {seed != null && <span className="absolute top-0.5 left-1.5 font-display font-800 text-white/90 text-[10px] sm:text-sm">{seed}</span>}
      <div className="flex-1 flex items-center justify-center p-1.5 min-h-0">
        {teamId && TEAM_LOGOS[teamId]
          ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={44} height={44} className="object-contain max-h-full w-auto" />
          : <span className="font-display font-800 text-white/40 text-xl">?</span>}
      </div>
      <div className="bg-black/40 px-1.5 py-1 flex items-center justify-between gap-1">
        <span className="font-display font-800 text-white text-[9px] sm:text-[11px] uppercase truncate">{teamId ? (TEAM_SHORT[teamId] ?? teamId) : 'TBD'}</span>
        {showWins && <span className="font-display font-800 text-white text-[11px] sm:text-sm tabular-nums leading-none">{wins}</span>}
      </div>
    </button>
  )
}

// ── SVG connector (scales cleanly on every screen) ────────────────────────────
function Connector({ side, top, bot, out }: { side: 'left' | 'right'; top: CardState; bot: CardState; out: CardState }) {
  const c = (s: CardState) => s === 'win' ? '#22c55e' : s === 'loss' ? '#ef4444' : '#3a4150'
  const p = side === 'left'
    ? { t: 'M0,22 H10 V50', b: 'M0,78 H10 V50', o: 'M10,50 H20' }
    : { t: 'M20,22 H10 V50', b: 'M20,78 H10 V50', o: 'M10,50 H0' }
  return (
    <svg viewBox="0 0 20 100" preserveAspectRatio="none" className="w-3 sm:w-6 self-stretch shrink-0">
      <path d={p.t} fill="none" stroke={c(top)} strokeWidth={2.5} />
      <path d={p.b} fill="none" stroke={c(bot)} strokeWidth={2.5} />
      <path d={p.o} fill="none" stroke={c(out)} strokeWidth={2.5} />
    </svg>
  )
}

// ── Game row (inside the detail modal) ────────────────────────────────────────
function GameRow({ game, index, onOpenBox }: { game: HSGame; index: number; onOpenBox: (g: HSGame) => void }) {
  const [wp, setWp] = useState<WinProbPoint[] | null>(null)
  const [wpOpen, setWpOpen] = useState(false)
  const hasResult = game.status !== 'scheduled' && game.homeScore != null && game.awayScore != null
  const realId = !game.id.startsWith('final-g')
  const toggleWp = async () => {
    const nx = !wpOpen; setWpOpen(nx)
    if (nx && !wp) { try { const r = await fetch(`/api/win-probability/${game.id}`); setWp((await r.json()).points ?? []) } catch { setWp([]) } }
  }
  const wHome = hasResult && (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const wAway = hasResult && (game.awayScore ?? 0) > (game.homeScore ?? 0)
  return (
    <div className="bg-[var(--card-hover)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="shrink-0 w-24">
          <p className="font-display font-800 text-xs text-white uppercase">Game {index + 1}{game.ifNecessary ? '*' : ''}</p>
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
            <button onClick={() => onOpenBox(game)} className="font-display font-800 text-[10px] uppercase tracking-wider text-white bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] px-2.5 py-1 rounded-lg transition-colors">Box</button>
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

const stateOf = (s: HSSeries | undefined | null, team: string | null): CardState =>
  !s || !s.clinchedBy || !team ? 'neutral' : s.clinchedBy === team ? 'win' : 'loss'

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
  const semiA = semifinals[0]
  const semiB = semifinals[1]
  const isLive = (s: HSSeries | null | undefined) => !!s?.games.some(g => g.status === 'live')

  // Finalists (from the final if present, else the semi winners).
  const finalLeft = final?.teamA ?? semiA?.clinchedBy ?? null
  const finalRight = final?.teamB ?? semiB?.clinchedBy ?? null
  const showFinalWins = !!final && (final.winsA > 0 || final.winsB > 0 || isLive(final))
  const nextGame = final && !final.clinchedBy ? (final.nextGame && final.nextGame.status === 'scheduled' ? final.nextGame : null) : null

  // For each semi: top card = the lower seed (teamB), bottom = the host / higher seed (teamA).
  const semiCol = (s: HSSeries | undefined, side: 'left' | 'right') => {
    const top = s ? s.teamB : null, bottom = s ? s.teamA : null
    const topState = stateOf(s, top), botState = stateOf(s, bottom)
    const outState: CardState = s?.clinchedBy ? 'win' : 'neutral'
    const cards = (
      <div className="flex flex-col justify-between h-40 sm:h-52 flex-1 min-w-0">
        <div className="h-[42%]"><BracketCard teamId={top} seed={top ? seeds[top] : undefined} wins={s?.winsB} showWins={!!s} state={topState} onClick={s ? () => setOpenSeries(s) : undefined} /></div>
        <div className="h-[42%]"><BracketCard teamId={bottom} seed={bottom ? seeds[bottom] : undefined} wins={s?.winsA} showWins={!!s} state={botState} onClick={s ? () => setOpenSeries(s) : undefined} /></div>
      </div>
    )
    const conn = <Connector side={side} top={topState} bot={botState} out={outState} />
    return side === 'left'
      ? <div className="flex items-stretch flex-1 min-w-0 max-w-[180px]">{cards}{conn}</div>
      : <div className="flex items-stretch flex-1 min-w-0 max-w-[180px]">{conn}{cards}</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-8 py-8">
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
            <div className="space-y-2">{openSeries.games.map((g, i) => <GameRow key={g.id} game={g} index={i} onOpenBox={setBox} />)}</div>
            {openSeries.games.some(g => g.ifNecessary) && <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-wider mt-3">* if necessary</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-4xl sm:text-5xl uppercase tracking-tight text-white"><strong>Postseason</strong><span className="text-[var(--accent)]"> Bracket</span></h1>
      </div>

      {/* Champion banner */}
      {final?.clinchedBy && (
        <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent)]/10 p-4 mb-6 flex items-center justify-center gap-3">
          <TeamBadge teamId={final.clinchedBy} size={40} />
          <p className="font-display font-800 italic text-xl sm:text-2xl uppercase text-white">🏆 {TEAM_NAMES[final.clinchedBy]} Champions</p>
        </div>
      )}

      {/* Bracket */}
      <div className="relative pt-11">
        <p className="absolute top-0 left-1/2 -translate-x-1/2 font-display font-800 italic text-sm sm:text-lg uppercase text-white text-center leading-none z-10">Holland<br />Series</p>
        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
          {semiCol(semiA, 'left')}
          {/* Final (center) */}
          <div className="flex items-center gap-0.5 shrink-0">
            <div className="w-11 sm:w-20 h-14 sm:h-24"><BracketCard teamId={finalLeft} seed={finalLeft ? seeds[finalLeft] : undefined} wins={final?.winsA} showWins={showFinalWins} state={stateOf(final, finalLeft)} onClick={final ? () => setOpenSeries(final) : undefined} /></div>
            <div className="w-11 sm:w-20 h-14 sm:h-24"><BracketCard teamId={finalRight} seed={finalRight ? seeds[finalRight] : undefined} wins={final?.winsB} showWins={showFinalWins} state={stateOf(final, finalRight)} onClick={final ? () => setOpenSeries(final) : undefined} /></div>
          </div>
          {semiCol(semiB, 'right')}
        </div>
      </div>

      {/* Final status / countdown */}
      {final && !final.clinchedBy && (
        <div className="flex flex-col items-center gap-2 mt-6">
          {isLive(final)
            ? <span className="inline-flex items-center gap-2 font-display font-800 text-xs uppercase tracking-widest text-[var(--accent)]"><span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />Game in progress</span>
            : nextGame
              ? <>
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest text-center">{finalScheduled ? 'Game 1' : 'Next game'} · {fmtDateTime(nextGame.startISO)}{nextGame.location ? ` · ${nextGame.location}` : ''}</p>
                  <Countdown targetISO={nextGame.startISO!} />
                </>
              : null}
        </div>
      )}

      <p className="text-center font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-8">Tap a team for game-by-game scores, boxscores &amp; win probability</p>
    </div>
  )
}
