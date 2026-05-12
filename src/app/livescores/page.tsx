'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#ffc425', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#e41d30', uvv: '#db002f',
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
}

type Data = {
  live: Game[]
  finished: Game[]
  upcoming: Game[]
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
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function ScoreRow({ game, isLive = false }: { game: Game; isLive?: boolean }) {
  const homeWon = (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const awayWon = (game.awayScore ?? 0) > (game.homeScore ?? 0)
  const isFinal = game.status === 'final'

  return (
    <div className={`relative rounded-xl overflow-hidden border transition-colors ${
      isLive ? 'border-[var(--accent)]/60 bg-[#0f1e2e]' : 'border-[var(--border)] bg-[var(--card)]'
    }`}>
      {/* Live pulse bar */}
      {isLive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)] animate-pulse" />}

      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
            {formatDate(game.gameDate)}{game.gameTime && ` · ${game.gameTime.slice(0, 5)}`}
          </p>
          {isLive && (
            <span className="flex items-center gap-1.5 bg-[var(--accent)] px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-display font-800 text-[10px] text-white uppercase tracking-widest">Live</span>
            </span>
          )}
          {isFinal && (
            <span className="font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">Final</span>
          )}
          {game.status === 'scheduled' && (
            <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Aankomend</span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-3">
          {/* Away */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${isFinal && !awayWon ? 'opacity-40' : ''}`}>
            <p className="font-display font-800 text-base md:text-lg uppercase text-white text-right leading-none truncate">
              <strong>{TEAM_NAMES[game.awayId ?? ''] ?? game.awayId ?? '–'}</strong>
            </p>
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
            <p className="font-display font-800 text-base md:text-lg uppercase text-white leading-none truncate">
              <strong>{TEAM_NAMES[game.homeId ?? ''] ?? game.homeId ?? '–'}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LivescoresPage() {
  const [data, setData]       = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/livescores')
      const json = await res.json()
      setData(json)
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
        <div className="text-right hidden sm:block">
          {lastRefresh && (
            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
              Bijgewerkt om {formatTime(lastRefresh.toISOString())}
            </p>
          )}
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">
            Ververst elke 60 sec
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-widest">Scores ophalen…</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Live wedstrijden */}
          {data.live.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Live Nu</strong></h2>
              </div>
              <div className="space-y-3">
                {data.live.map(g => <ScoreRow key={g.id} game={g} isLive />)}
              </div>
            </section>
          )}

          {/* Geen live */}
          {!hasLive && (
            <div className="border border-[var(--border)] rounded-xl px-6 py-10 text-center">
              <p className="font-display font-800 text-xl uppercase text-[var(--muted)] italic mb-1">Geen live wedstrijden</p>
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                Tijdens wedstrijddagen verschijnen scores hier automatisch
              </p>
            </div>
          )}

          {/* Afgerond */}
          {data.finished.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--border)]" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Afgerond</strong></h2>
              </div>
              <div className="space-y-2">
                {data.finished.map(g => <ScoreRow key={g.id} game={g} />)}
              </div>
            </section>
          )}

          {/* Aankomend */}
          {data.upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--border)]" />
                <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>Aankomend</strong></h2>
              </div>
              <div className="space-y-2">
                {data.upcoming.map(g => <ScoreRow key={g.id} game={g} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
