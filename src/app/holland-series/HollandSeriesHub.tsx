'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import BoxscoreModal from '@/components/BoxscoreModal'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT, teamAccent } from '@/lib/teams'
import type { WinProbPoint } from '@/app/api/win-probability/[gameId]/route'
import type { HollandSeriesData, HSGame, HSSeries } from '@/lib/holland-series'

const WinProbChart = dynamic(() => import('@/components/WinProbChart'), { ssr: false })

// The Holland Series is always played in late Aug / early Sep (CEST = UTC+2),
// so a fixed offset turns the feed's wall-clock time into a correct instant for
// every viewer regardless of their own timezone.
function feedDate(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(`${iso.replace(' ', 'T')}+02:00`)
  return isNaN(d.getTime()) ? null : d
}

const fmtDateTime = (iso: string | null) => {
  const d = feedDate(iso)
  if (!d) return 'TBD'
  return d.toLocaleString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ targetISO }: { targetISO: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const target = feedDate(targetISO)?.getTime() ?? 0
  const diff = Math.max(0, target - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const unit = (v: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="font-display font-800 text-3xl md:text-4xl text-white tabular-nums">{String(v).padStart(2, '0')}</span>
      <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{label}</span>
    </div>
  )
  return (
    <div className="flex items-center gap-4 md:gap-6">
      {d > 0 && unit(d, 'Dagen')}
      {unit(h, 'Uur')}
      {unit(m, 'Min')}
      {unit(s, 'Sec')}
    </div>
  )
}

// ── Team pill ─────────────────────────────────────────────────────────────────
function TeamBadge({ teamId, size = 48 }: { teamId: string; size?: number }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="rounded-2xl flex items-center justify-center shrink-0 p-2" style={{ backgroundColor: color, width: size, height: size }}>
      {logo
        ? <Image src={logo} alt={teamId} width={size - 16} height={size - 16} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-sm">{TEAM_SHORT[teamId] ?? teamId.slice(0, 3).toUpperCase()}</span>}
    </div>
  )
}

// ── Series scoreboard ─────────────────────────────────────────────────────────
function Scoreboard({ series, big }: { series: HSSeries; big?: boolean }) {
  const { teamA, teamB, winsA, winsB, bestOf, clinchedBy } = series
  const logoSize = big ? 72 : 48
  const scoreCls = big ? 'text-6xl md:text-7xl' : 'text-4xl'
  return (
    <div>
      <div className="flex items-center justify-center gap-5 md:gap-10">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamBadge teamId={teamA} size={logoSize} />
          <p className="font-display font-800 uppercase text-white text-center leading-none truncate w-full">
            {big ? <strong>{TEAM_NAMES[teamA] ?? teamA}</strong> : TEAM_SHORT[teamA]}
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <span className={`font-display font-800 tabular-nums ${scoreCls}`} style={{ color: winsA >= winsB ? teamAccent(teamA) : 'var(--muted)' }}>{winsA}</span>
          <span className="font-display font-700 text-[var(--muted)] text-xl">–</span>
          <span className={`font-display font-800 tabular-nums ${scoreCls}`} style={{ color: winsB >= winsA ? teamAccent(teamB) : 'var(--muted)' }}>{winsB}</span>
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamBadge teamId={teamB} size={logoSize} />
          <p className="font-display font-800 uppercase text-white text-center leading-none truncate w-full">
            {big ? <strong>{TEAM_NAMES[teamB] ?? teamB}</strong> : TEAM_SHORT[teamB]}
          </p>
        </div>
      </div>
      <p className="text-center font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-4">
        {clinchedBy
          ? `${TEAM_NAMES[clinchedBy] ?? clinchedBy} wint de serie`
          : `Best of ${bestOf}`}
      </p>
    </div>
  )
}

// ── Game row (with boxscore + win-prob) ───────────────────────────────────────
function GameRow({ game, index, onOpenBox }: { game: HSGame; index: number; onOpenBox: (g: HSGame) => void }) {
  const [wp, setWp] = useState<WinProbPoint[] | null>(null)
  const [wpOpen, setWpOpen] = useState(false)
  const [wpLoading, setWpLoading] = useState(false)

  const hasResult = game.status !== 'scheduled' && game.homeScore != null && game.awayScore != null

  const toggleWp = async () => {
    const next = !wpOpen
    setWpOpen(next)
    if (next && !wp && !wpLoading) {
      setWpLoading(true)
      try {
        const r = await fetch(`/api/win-probability/${game.id}`)
        const d = await r.json()
        setWp(d.points ?? [])
      } catch { setWp([]) }
      setWpLoading(false)
    }
  }

  const winnerHome = hasResult && (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const winnerAway = hasResult && (game.awayScore ?? 0) > (game.homeScore ?? 0)

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0 w-14">
          <p className="font-display font-800 text-xs text-[var(--muted)] uppercase">Game {index + 1}</p>
          {game.status === 'live'
            ? <span className="inline-flex items-center gap-1 font-display font-800 text-[10px] text-[var(--accent)] uppercase"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />Live</span>
            : <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase">{game.status === 'final' ? 'Final' : fmtDateTime(game.startISO)}</p>}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* away */}
          <div className="flex items-center gap-2">
            <TeamBadge teamId={game.awayId} size={26} />
            <span className={`font-display font-800 uppercase text-sm flex-1 truncate ${winnerAway ? 'text-white' : 'text-[var(--muted)]'}`}>{TEAM_NAMES[game.awayId] ?? game.awayId}</span>
            {hasResult && <span className={`font-display font-800 tabular-nums ${winnerAway ? 'text-white' : 'text-[var(--muted)]'}`}>{game.awayScore}</span>}
          </div>
          {/* home */}
          <div className="flex items-center gap-2">
            <TeamBadge teamId={game.homeId} size={26} />
            <span className={`font-display font-800 uppercase text-sm flex-1 truncate ${winnerHome ? 'text-white' : 'text-[var(--muted)]'}`}>{TEAM_NAMES[game.homeId] ?? game.homeId}</span>
            {hasResult && <span className={`font-display font-800 tabular-nums ${winnerHome ? 'text-white' : 'text-[var(--muted)]'}`}>{game.homeScore}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {hasResult && (
            <button onClick={() => onOpenBox(game)} className="font-display font-800 text-[11px] uppercase tracking-wider text-white bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--accent)] px-3 py-1.5 rounded-lg transition-colors">
              Boxscore
            </button>
          )}
          {hasResult && (
            <button onClick={toggleWp} className="font-display font-700 text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
              {wpOpen ? 'Verberg WP' : 'Win prob.'}
            </button>
          )}
        </div>
      </div>

      {wpOpen && (
        wpLoading
          ? <p className="px-5 pb-4 font-display font-700 text-[var(--muted)] text-xs uppercase">Laden…</p>
          : wp && wp.length >= 2
            ? <WinProbChart points={wp} homeId={game.homeId} awayId={game.awayId} homeColor={teamAccent(game.homeId)} awayColor={teamAccent(game.awayId)} />
            : <p className="px-5 pb-4 font-display font-700 text-[var(--muted)] text-xs uppercase">Geen play-by-play data</p>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-800 italic text-2xl uppercase text-white mb-4"><strong>{children}</strong></h2>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HollandSeriesHub({ initial }: { initial: HollandSeriesData }) {
  const [data, setData] = useState(initial)
  const [box, setBox] = useState<HSGame | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/holland-series', { cache: 'no-store' })
      if (r.ok) setData(await r.json())
    } catch { /* keep last good data */ }
  }, [])

  useEffect(() => {
    const t = setInterval(refresh, 30_000)
    const onVis = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh])

  const { phase, final, semifinals, finalists } = data
  const liveGame = final?.games.find(g => g.status === 'live') ?? null
  const nextGame = final?.nextGame && final.nextGame.status === 'scheduled' ? final.nextGame : null

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
      {box && (
        <BoxscoreModal
          gameId={box.id}
          awayId={box.awayId}
          homeId={box.homeId}
          awayScore={box.awayScore}
          homeScore={box.homeScore}
          gameDate={fmtDateTime(box.startISO)}
          onClose={() => setBox(null)}
        />
      )}

      {/* Header */}
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Postseason 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Holland</strong><span className="text-[var(--accent)]"> Series</span>
        </h1>
      </div>

      {/* ── FINAL is live/scheduled ── */}
      {phase === 'final' && final && (
        <>
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
            <Scoreboard series={final} big />
            <div className="mt-8 flex flex-col items-center gap-3">
              {liveGame ? (
                <span className="inline-flex items-center gap-2 font-display font-800 text-sm uppercase tracking-widest text-[var(--accent)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" /> Game bezig
                </span>
              ) : final.clinchedBy ? (
                <p className="font-display font-800 italic text-xl uppercase text-white text-center">🏆 {TEAM_NAMES[final.clinchedBy]} — Kampioen</p>
              ) : nextGame ? (
                <>
                  <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">Volgende game — {fmtDateTime(nextGame.startISO)}{nextGame.location ? ` · ${nextGame.location}` : ''}</p>
                  <Countdown targetISO={nextGame.startISO!} />
                </>
              ) : null}
            </div>
          </section>

          <section>
            <SectionTitle>Schema &amp; Uitslagen</SectionTitle>
            <div className="space-y-3">
              {final.games.map((g, i) => <GameRow key={g.id} game={g} index={i} onOpenBox={setBox} />)}
            </div>
          </section>
        </>
      )}

      {/* ── Pre-final: finalists known, schedule pending ── */}
      {phase === 'pre-final' && (
        <>
          {finalists && finalists.length === 2 && (
            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
              <p className="text-center font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest mb-5">De finalisten</p>
              <div className="flex items-center justify-center gap-6 md:gap-12">
                <div className="flex flex-col items-center gap-2">
                  <TeamBadge teamId={finalists[0]} size={72} />
                  <p className="font-display font-800 uppercase text-white text-center"><strong>{TEAM_NAMES[finalists[0]]}</strong></p>
                </div>
                <span className="font-display font-800 italic text-2xl text-[var(--muted)]">VS</span>
                <div className="flex flex-col items-center gap-2">
                  <TeamBadge teamId={finalists[1]} size={72} />
                  <p className="font-display font-800 uppercase text-white text-center"><strong>{TEAM_NAMES[finalists[1]]}</strong></p>
                </div>
              </div>
              <p className="text-center font-display font-700 text-sm text-[var(--muted)] uppercase tracking-widest mt-6">Schema volgt — best of 5</p>
            </section>
          )}

          <section>
            <SectionTitle>Road to the Holland Series</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semifinals.map(s => (
                <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-4">{s.label}</p>
                  <Scoreboard series={s} />
                  <div className="mt-5 space-y-2">
                    {s.games.map((g, i) => <GameRow key={g.id} game={g} index={i} onOpenBox={setBox} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {phase === 'none' && (
        <div className="text-center py-20">
          <p className="font-display font-800 text-2xl uppercase text-[var(--muted)] italic">Playoffs nog niet begonnen</p>
          <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest mt-2">Zodra de postseason start verschijnt hier alles</p>
        </div>
      )}
    </div>
  )
}
