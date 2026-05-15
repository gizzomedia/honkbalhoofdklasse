'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import BoxscoreModal from '@/components/BoxscoreModal'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
}
const TEAM_LOGOS: Record<string, string> = {
  neptunus: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654466/Neptunus_logo_wit_afyyae.png',
  pirates:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/pirates_logo_ic4rk8.png',
  kinheim:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/Kinheim_logo_d4zw2t.png',
  hcaw:     'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/HCAW_logo_wit_rijssy.png',
  twins:    'https://res.cloudinary.com/dqld625sq/image/upload/v1770654463/Twins_wit_c7dumy.png',
  pioniers: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654445/Pioniers_logo_mqj4tb.png',
  uvv:      'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/UVV_logo_xcaa5d.png',
}
const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

type Game = {
  id: string
  gameDate: string
  gameTime: string | null
  homeId: string | null
  awayId: string | null
  status: 'live' | 'final' | 'scheduled'
  homeScore: number | null
  awayScore: number | null
  // live situation
  inning?:   number
  isBottom?: boolean
  outs?:     number
  runner1?:  boolean
  runner2?:  boolean
  runner3?:  boolean
}

type StandingsEntry = { wins: number; losses: number }

type Data = {
  live: Game[]
  finished: Game[]
  upcoming: Game[]
  standings: Record<string, StandingsEntry>
  updatedAt: string
}

function TeamLogo({ teamId, size = 44 }: { teamId: string | null; size?: number }) {
  if (!teamId) return <div style={{ width: size, height: size }} className="bg-[var(--card-hover)] rounded-lg" />
  const logo  = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0 p-1.5"
      style={{ backgroundColor: color, width: size, height: size }}>
      {logo
        ? <Image src={logo} alt={teamId} width={size - 8} height={size - 8} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-xs">{teamId.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function BaseDiamond({ r1, r2, r3 }: { r1: boolean; r2: boolean; r3: boolean }) {
  const on = '#fe3d00', off = '#1a2a3a'
  return (
    <svg width="28" height="22" viewBox="0 0 28 22">
      <rect x="10" y="0"  width="8" height="8" transform="rotate(45 14 4)"  fill={r2 ? on : off} />
      <rect x="18" y="7"  width="8" height="8" transform="rotate(45 22 11)" fill={r1 ? on : off} />
      <rect x="2"  y="7"  width="8" height="8" transform="rotate(45 6 11)"  fill={r3 ? on : off} />
    </svg>
  )
}

function ScoreRow({
  game, isLive = false, standings = {}, onClick,
}: {
  game: Game
  isLive?: boolean
  standings?: Record<string, StandingsEntry>
  onClick?: () => void
}) {
  const homeWon   = (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const awayWon   = (game.awayScore ?? 0) > (game.homeScore ?? 0)
  const isFinal   = game.status === 'final'
  const clickable = game.status !== 'scheduled'

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`relative rounded-xl overflow-hidden border transition-all ${
        isLive
          ? 'border-[var(--accent)]/60 bg-[#0f1e2e]'
          : 'border-[var(--border)] bg-[var(--card)]'
      } ${clickable ? 'cursor-pointer hover:border-[var(--accent)]/60 hover:bg-[#0d1a2a]' : ''}`}
    >
      {isLive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)] animate-pulse" />}

      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
            {formatDate(game.gameDate)}{game.gameTime && ` · ${game.gameTime.slice(0, 5)}`}
          </p>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 bg-[var(--accent)] px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="font-display font-800 text-[10px] text-white uppercase tracking-widest">Live</span>
              </span>
            )}
            {isFinal && <span className="font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">Final</span>}
            {game.status === 'scheduled' && <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Upcoming</span>}
            {clickable && <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Boxscore →</span>}
          </div>
        </div>

        {/* Teams + score — vertically centered */}
        <div className="flex items-center gap-3">
          {/* Away */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${isFinal && !awayWon ? 'opacity-40' : ''}`}>
            <div className="text-right min-w-0">
              <p className="font-display font-800 text-base md:text-lg uppercase text-white leading-tight truncate">
                <strong>{TEAM_NAMES[game.awayId ?? ''] ?? game.awayId ?? '–'}</strong>
              </p>
              {game.awayId && standings[game.awayId] && (
                <p className="font-display font-600 text-[11px] text-[var(--muted)] leading-none mt-0.5">
                  {standings[game.awayId].wins}-{standings[game.awayId].losses}
                </p>
              )}
            </div>
            <TeamLogo teamId={game.awayId} size={40} />
          </div>

          {/* Score / VS */}
          <div className="shrink-0 w-16 text-center">
            {game.homeScore !== null && game.awayScore !== null ? (
              <p className="font-display font-800 text-2xl text-white tracking-tight tabular-nums">
                <span className={awayWon ? 'text-white' : isFinal ? 'text-white/40' : 'text-white'}>{game.awayScore}</span>
                <span className="text-[var(--muted)] mx-1">–</span>
                <span className={homeWon ? 'text-white' : isFinal ? 'text-white/40' : 'text-white'}>{game.homeScore}</span>
              </p>
            ) : (
              <p className="font-display font-800 italic text-lg text-[var(--muted)]">VS</p>
            )}
          </div>

          {/* Home */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 ${isFinal && !homeWon ? 'opacity-40' : ''}`}>
            <TeamLogo teamId={game.homeId} size={40} />
            <div className="min-w-0">
              <p className="font-display font-800 text-base md:text-lg uppercase text-white leading-tight truncate">
                <strong>{TEAM_NAMES[game.homeId ?? ''] ?? game.homeId ?? '–'}</strong>
              </p>
              {game.homeId && standings[game.homeId] && (
                <p className="font-display font-600 text-[11px] text-[var(--muted)] leading-none mt-0.5">
                  {standings[game.homeId].wins}-{standings[game.homeId].losses}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live situation: inning · outs · runners */}
        {isLive && game.inning != null && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]/50">
            <span className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-widest">
              {game.isBottom ? 'Bot' : 'Top'} {game.inning}
            </span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < (game.outs ?? 0) ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
              ))}
              <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase ml-1">out</span>
            </div>
            <BaseDiamond r1={game.runner1 ?? false} r2={game.runner2 ?? false} r3={game.runner3 ?? false} />
          </div>
        )}
      </div>
    </div>
  )
}

function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]   = useState('')
  const [state, setState]   = useState<'idle' | 'loading' | 'done' | 'already' | 'error'>('idle')
  const inputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function subscribe() {
    if (!email.includes('@')) return
    setState('loading')
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      const d = await res.json()
      setState(d.already ? 'already' : 'done')
    } else {
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1b2e] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="font-display font-800 text-sm uppercase text-white tracking-widest">Live Notifications</p>
          </div>
          <p className="font-display font-700 text-xs text-[var(--muted)]">
            Get an email when a game goes live or a new Pickle / Immaculate is available.
          </p>
        </div>

        {(state === 'done' || state === 'already') ? (
          <div className="text-center py-4">
            <p className="font-display font-800 text-sm text-green-400 uppercase tracking-widest">
              {state === 'done' ? '✓ Subscribed!' : '✓ Already subscribed'}
            </p>
            <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">
              {state === 'done' ? "You'll receive an email when a game goes live." : 'This email address is already in the list.'}
            </p>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && subscribe()}
              className="w-full bg-[#060e1b] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
            />
            {state === 'error' && (
              <p className="font-display font-700 text-xs text-red-400 uppercase tracking-widest">Subscribe failed, please try again.</p>
            )}
            <button
              onClick={subscribe}
              disabled={state === 'loading' || !email.includes('@')}
              className="w-full bg-[var(--accent)] py-3 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {state === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Subscribing…
                </span>
              ) : 'Subscribe to notifications'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function LivescoresPage() {
  const [data, setData]           = useState<Data | null>(null)
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [selected, setSelected]   = useState<Game | null>(null)
  const [showSubscribe, setShowSubscribe] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/livescores')
      setData(await res.json())
      setLastRefresh(new Date())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  const hasLive = (data?.live?.length ?? 0) > 0

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
            Honkbal Hoofdklasse
          </p>
          <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
            <strong>Live</strong>
            <span className="text-[var(--accent)]"> Scores</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            {lastRefresh && (
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                Updated at {formatTime(lastRefresh.toISOString())}
              </p>
            )}
            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">
              Refreshes every 60s
            </p>
          </div>
          {/* Bell / subscribe button */}
          <button
            onClick={() => setShowSubscribe(true)}
            className="flex items-center gap-2 border border-[var(--border)] hover:border-[var(--accent)] hover:text-white text-[var(--muted)] transition-colors rounded-xl px-3 py-2.5"
            title="Live notificaties"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="font-display font-700 text-xs uppercase tracking-widest hidden sm:block">Notifications</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-widest">Loading scores…</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Live games */}
          {data.live.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Live Now</strong></h2>
              </div>
              <div className="space-y-3">
                {data.live.map(g => (
                  <ScoreRow key={g.id} game={g} isLive standings={data.standings ?? {}} onClick={() => setSelected(g)} />
                ))}
              </div>
            </section>
          )}

          {/* No live games */}
          {!hasLive && (
            <div className="border border-[var(--border)] rounded-xl px-6 py-10 text-center">
              <p className="font-display font-800 text-xl uppercase text-[var(--muted)] italic mb-1">No live games</p>
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                Scores appear here automatically on game days
              </p>
            </div>
          )}

          {/* Recent results */}
          {data.finished.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--border)]" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Results</strong></h2>
              </div>
              <div className="space-y-2">
                {data.finished.map(g => (
                  <ScoreRow key={g.id} game={g} standings={data.standings ?? {}} onClick={() => setSelected(g)} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {data.upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--border)]" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Upcoming</strong></h2>
              </div>
              <div className="space-y-2">
                {data.upcoming.map(g => (
                  <ScoreRow key={g.id} game={g} standings={data.standings ?? {}} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Subscribe modal */}
      {showSubscribe && <SubscribeModal onClose={() => setShowSubscribe(false)} />}

      {/* Boxscore modal */}
      {selected && (
        <BoxscoreModal
          gameId={selected.id}
          awayId={selected.awayId ?? ''}
          homeId={selected.homeId ?? ''}
          awayScore={selected.awayScore}
          homeScore={selected.homeScore}
          gameDate={selected.gameDate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
