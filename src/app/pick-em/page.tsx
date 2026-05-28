'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { TEAM_LOGOS, TEAM_NAMES, TEAM_COLORS, TEAM_SHORT } from '@/lib/teams'

type Game = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  status: string
  home_score: number | null
  away_score: number | null
}

type Pick = {
  game_id: number
  picked_team_id: string
}

type LeaderEntry = {
  token: string
  nickname: string
  correct: number
  total: number
  pct: number
}

type UserInfo = { token: string; nickname: string }

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

function isLocked(game: Game) {
  if (game.status !== 'scheduled') return true
  const lock = new Date(`${game.game_date}T${game.game_time ?? '23:59:00'}`)
  return new Date() >= lock
}

function getWinner(game: Game): string | null {
  if (game.status !== 'final' || game.home_score == null || game.away_score == null) return null
  if (game.home_score > game.away_score) return game.home_team_id
  if (game.away_score > game.home_score) return game.away_team_id
  return null
}

export default function PickEmPage() {
  const [user, setUser]               = useState<UserInfo | null>(null)
  const [nickInput, setNickInput]     = useState('')
  const [games, setGames]             = useState<Game[]>([])
  const [picks, setPicks]             = useState<Map<number, string>>(new Map())
  const [saving, setSaving]           = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [tab, setTab]                 = useState<'picks' | 'leaderboard'>('picks')
  const [loading, setLoading]         = useState(true)

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pickem_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
  }, [])

  const loadData = useCallback(async (token: string) => {
    setLoading(true)
    const [gamesRes, lbRes] = await Promise.all([
      fetch(`/api/pick-em?token=${token}`),
      fetch('/api/pick-em/leaderboard'),
    ])
    const { games: g, picks: p } = await gamesRes.json()
    const lb = await lbRes.json()
    setGames(g ?? [])
    const map = new Map<number, string>()
    for (const pick of (p ?? [])) map.set(pick.game_id, pick.picked_team_id)
    setPicks(map)
    setLeaderboard(lb ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadData(user.token)
  }, [user, loadData])

  function saveUser() {
    const nick = nickInput.trim()
    if (!nick) return
    const token = crypto.randomUUID()
    const u = { token, nickname: nick }
    localStorage.setItem('pickem_user', JSON.stringify(u))
    setUser(u)
  }

  async function pick(gameId: number, teamId: string) {
    if (!user) return
    const game = games.find(g => g.id === gameId)
    if (!game || isLocked(game)) return

    // Optimistic update
    setPicks(prev => new Map(prev).set(gameId, teamId))
    setSaving(gameId)

    await fetch('/api/pick-em', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken: user.token,
        nickname: user.nickname,
        gameId,
        pickedTeamId: teamId,
      }),
    })
    setSaving(null)
  }

  // Group games by week
  const grouped = games.reduce<Record<string, Game[]>>((acc, g) => {
    const key = getWeekKey(g.game_date)
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})

  const weekKeys = Object.keys(grouped).sort()

  // Find current/upcoming week
  const today = new Date().toISOString().split('T')[0]
  const activeWeek = weekKeys.find(k => {
    const games = grouped[k]
    return games.some(g => g.game_date >= today || g.status === 'scheduled' || g.status === 'live')
  }) ?? weekKeys[weekKeys.length - 1]

  const visibleWeeks = weekKeys.filter(week =>
    grouped[week].some(g => g.status === 'scheduled' || g.status === 'live')
  )

  const myRank = user ? leaderboard.findIndex(e => e.token === user.token) + 1 : 0
  const myEntry = user ? leaderboard.find(e => e.token === user.token) : null

  // Nickname screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#06101e] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-2">Honkbal Hoofdklasse</p>
            <h1 className="font-display font-800 italic text-5xl uppercase text-white leading-none">
              Pick <span className="text-[var(--accent)]">'em</span>
            </h1>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-3 uppercase tracking-wider">
              Voorspel elke ronde de uitslagen
            </p>
          </div>

          <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-6">
            <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">
              Kies een bijnaam
            </p>
            <input
              type="text"
              value={nickInput}
              onChange={e => setNickInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveUser()}
              placeholder="Jouw naam…"
              maxLength={20}
              className="w-full bg-[#06101e] border border-[#1a2a3a] rounded-xl px-4 py-3 font-display font-700 text-white placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-colors mb-3"
            />
            <button
              onClick={saveUser}
              disabled={!nickInput.trim()}
              className="w-full bg-[var(--accent)] text-white font-display font-800 text-sm uppercase tracking-wider py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Spelen →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06101e] px-4 pt-20 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-1">Honkbal Hoofdklasse</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display font-800 italic text-5xl uppercase text-white leading-none">
              Pick <span className="text-[var(--accent)]">'em</span>
            </h1>
            {myEntry && (
              <div className="text-right">
                <p className="font-display font-800 text-lg text-white">{myEntry.correct}/{myEntry.total}</p>
                <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider">
                  {myRank > 0 ? `#${myRank} · ` : ''}{myEntry.pct}% goed
                </p>
              </div>
            )}
          </div>
          <p className="font-display font-700 text-sm text-[var(--muted)] mt-1 uppercase tracking-wider">
            Hallo {user.nickname} ·{' '}
            <button
              onClick={() => { localStorage.removeItem('pickem_user'); setUser(null) }}
              className="text-[var(--accent)] hover:underline"
            >
              Wijzigen
            </button>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-1">
          {(['picks', 'leaderboard'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 font-display font-800 text-xs uppercase tracking-wider py-2.5 rounded-lg transition-colors ${
                tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {t === 'picks' ? 'Voorspellingen' : 'Ranglijst'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider animate-pulse">Laden…</p>
          </div>
        )}

        {/* Picks tab */}
        {!loading && tab === 'picks' && (
          <div className="space-y-8">
            {visibleWeeks.map(week => {
              const weekGames = grouped[week]
              const dates = [...new Set(weekGames.map(g => g.game_date))].sort()
              const isCurrentWeek = week === activeWeek

              return (
                <div key={week}>
                  {/* Round header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-5 bg-[var(--accent)] shrink-0" />
                    <h2 className="font-display font-800 text-sm uppercase text-white tracking-wide">
                      {isCurrentWeek ? 'Huidige ronde' : `Week ${week}`}
                    </h2>
                    {(() => {
                      const total = weekGames.length
                      const done  = weekGames.filter(g => picks.has(g.id)).length
                      if (done === 0) return null
                      return (
                        <span className={`font-display font-700 text-xs uppercase tracking-wider ${done === total ? 'text-green-400' : 'text-[var(--accent)]'}`}>
                          {done}/{total} ingevuld
                        </span>
                      )
                    })()}
                  </div>

                  {/* Games per date */}
                  {dates.map(date => (
                    <div key={date} className="mb-4">
                      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2 pl-1">
                        {fmtDate(date)}
                      </p>
                      <div className="space-y-2">
                        {weekGames.filter(g => g.game_date === date).map(game => {
                          const locked     = isLocked(game)
                          const myPick     = picks.get(game.id)
                          const winner     = getWinner(game)
                          const isSaving   = saving === game.id
                          const isFinal    = game.status === 'final'
                          const isCorrect  = isFinal && myPick && winner === myPick
                          const isWrong    = isFinal && myPick && winner && winner !== myPick

                          return (
                            <div
                              key={game.id}
                              className={`border rounded-2xl overflow-hidden transition-colors ${
                                isCorrect ? 'border-green-500/40 bg-green-500/5' :
                                isWrong   ? 'border-red-500/20 bg-red-500/5' :
                                myPick    ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5' :
                                            'border-[#1a2a3a] bg-[#0a1220]'
                              }`}
                            >
                              {/* Game time + status */}
                              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                                <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                                  {fmtTime(game.game_time)}
                                </span>
                                <span className={`font-display font-700 text-[10px] uppercase tracking-widest ${
                                  game.status === 'live' ? 'text-[var(--accent)]' :
                                  isFinal ? 'text-[var(--muted)]' : ''
                                }`}>
                                  {game.status === 'live' ? '● Live' :
                                   isFinal ? 'Gespeeld' :
                                   locked  ? 'Gesloten' :
                                   isCorrect !== undefined && myPick ? '✓ Ingevuld' : ''}
                                </span>
                              </div>

                              {/* Teams row */}
                              <div className="flex items-stretch px-3 pb-3 gap-2">
                                {/* Away team */}
                                <TeamButton
                                  teamId={game.away_team_id}
                                  picked={myPick === game.away_team_id}
                                  winner={winner === game.away_team_id}
                                  locked={locked}
                                  isFinal={isFinal}
                                  isSaving={isSaving}
                                  score={isFinal ? game.away_score : null}
                                  onClick={() => pick(game.id, game.away_team_id)}
                                />

                                {/* VS */}
                                <div className="flex items-center justify-center px-1 shrink-0">
                                  <span className="font-display font-800 text-xs text-[var(--muted)]">VS</span>
                                </div>

                                {/* Home team */}
                                <TeamButton
                                  teamId={game.home_team_id}
                                  picked={myPick === game.home_team_id}
                                  winner={winner === game.home_team_id}
                                  locked={locked}
                                  isFinal={isFinal}
                                  isSaving={isSaving}
                                  score={isFinal ? game.home_score : null}
                                  onClick={() => pick(game.id, game.home_team_id)}
                                />
                              </div>

                              {/* Result feedback */}
                              {isFinal && myPick && (
                                <div className={`px-4 py-2 text-center border-t ${isCorrect ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                                  <p className={`font-display font-800 text-xs uppercase tracking-widest ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {isCorrect ? '✓ Goed voorspeld!' : '✗ Helaas, fout voorspeld'}
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Leaderboard tab */}
        {!loading && tab === 'leaderboard' && (
          <div>
            {leaderboard.length === 0 ? (
              <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-8 text-center">
                <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">
                  Nog geen resultaten — kom terug na de eerste gespeelde wedstrijd.
                </p>
              </div>
            ) : (
              <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="grid px-5 py-3 border-b border-[#1a2a3a]" style={{ gridTemplateColumns: '40px 1fr 80px 80px 60px' }}>
                  {['#', 'Naam', 'Goed', 'Totaal', '%'].map(h => (
                    <span key={h} className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center first:text-left">{h}</span>
                  ))}
                </div>

                {leaderboard.map((entry, i) => {
                  const isMe = entry.token === user?.token
                  return (
                    <div
                      key={entry.token}
                      className={`grid items-center px-5 py-3.5 border-b border-[#1a2a3a] last:border-0 ${isMe ? 'bg-[var(--accent)]/10' : i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                      style={{ gridTemplateColumns: '40px 1fr 80px 80px 60px' }}
                    >
                      <span className={`font-display font-800 text-sm text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-[var(--muted)]'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <span className={`font-display font-800 text-sm truncate ${isMe ? 'text-[var(--accent)]' : 'text-white'}`}>
                        {entry.nickname}{isMe ? ' (jij)' : ''}
                      </span>
                      <span className="font-display font-800 text-sm text-green-400 text-center">{entry.correct}</span>
                      <span className="font-display font-700 text-sm text-[var(--muted)] text-center">{entry.total}</span>
                      <span className="font-display font-700 text-sm text-white text-center">{entry.pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamButton({
  teamId, picked, winner, locked, isFinal, isSaving, score, onClick,
}: {
  teamId: string
  picked: boolean
  winner: boolean
  locked: boolean
  isFinal: boolean
  isSaving: boolean
  score: number | null
  onClick: () => void
}) {
  const color = TEAM_COLORS[teamId] ?? '#1e335a'

  return (
    <button
      onClick={onClick}
      disabled={locked || isSaving}
      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
        !locked ? 'active:scale-95' : ''
      } ${
        picked && winner  ? 'ring-2 ring-green-400' :
        picked && isFinal ? 'ring-2 ring-red-400/50' :
        picked            ? 'ring-2 ring-[var(--accent)]' :
        winner            ? 'ring-1 ring-green-400/40' :
                            'ring-1 ring-transparent'
      }`}
      style={picked ? { background: color + '22' } : {}}
    >
      {/* Logo */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center p-2"
        style={{ backgroundColor: color }}
      >
        <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={36} height={36} className="object-contain w-full h-full" />
      </div>

      {/* Name */}
      <span className={`font-display font-800 text-xs uppercase tracking-wide ${picked ? 'text-white' : 'text-white/70'}`}>
        {TEAM_SHORT[teamId] ?? teamId.toUpperCase()}
      </span>

      {/* Score (final) */}
      {isFinal && score !== null && (
        <span className={`font-display font-900 text-xl ${winner ? 'text-white' : 'text-white/40'}`}>
          {score}
        </span>
      )}

      {/* Picked indicator */}
      {picked && !isFinal && (
        <span className="font-display font-700 text-[9px] text-[var(--accent)] uppercase tracking-widest">
          Jouw keuze
        </span>
      )}
    </button>
  )
}
