'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}

function getVoterId(): string {
  let id = localStorage.getItem('hk_voter_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('hk_voter_id', id)
  }
  return id
}

export default function PredictionWidget({
  gameId,
  homeTeamId,
  awayTeamId,
}: {
  gameId: number
  homeTeamId: string
  awayTeamId: string
}) {
  const [homeVotes, setHomeVotes] = useState(0)
  const [awayVotes, setAwayVotes] = useState(0)
  const [votedFor, setVotedFor] = useState<'home' | 'away' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const voterId = getVoterId()

    async function load() {
      const { data } = await supabase
        .from('predictions')
        .select('predicted_winner, voter_id')
        .eq('game_id', gameId)

      if (data) {
        setHomeVotes(data.filter(r => r.predicted_winner === 'home').length)
        setAwayVotes(data.filter(r => r.predicted_winner === 'away').length)
        const myVote = data.find(r => r.voter_id === voterId)
        if (myVote) setVotedFor(myVote.predicted_winner as 'home' | 'away')
      }
      setLoading(false)
    }

    load()
  }, [gameId])

  async function vote(side: 'home' | 'away') {
    if (votedFor || loading) return
    const voterId = getVoterId()

    const { error: err } = await supabase
      .from('predictions')
      .upsert(
        { game_id: gameId, predicted_winner: side, voter_id: voterId },
        { onConflict: 'game_id,voter_id' }
      )

    if (!err) {
      setVotedFor(side)
      if (side === 'home') setHomeVotes(v => v + 1)
      else setAwayVotes(v => v + 1)
    } else {
      console.error('Prediction error:', err)
      setError(true)
    }
  }

  const total = homeVotes + awayVotes
  const awayPct = total > 0 ? Math.round((awayVotes / total) * 100) : 50
  const homePct = total > 0 ? Math.round((homeVotes / total) * 100) : 50

  if (loading) return null
  if (error) return (
    <div className="border-t border-[var(--border)] pt-3 mt-1">
      <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
        Voting temporarily unavailable
      </p>
    </div>
  )

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-1">
      <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mb-2">
        Wie wint?
        {votedFor && total > 0 && (
          <span className="ml-2 normal-case font-400">· {total} stem{total !== 1 ? 'men' : ''}</span>
        )}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => vote('away')}
          disabled={!!votedFor}
          className={`flex-1 rounded-lg py-2 px-3 text-center font-display font-800 text-sm uppercase transition-all ${
            votedFor === 'away'
              ? 'bg-[var(--accent)] text-white'
              : votedFor
              ? 'bg-[var(--card-hover)] text-[var(--muted)] cursor-default opacity-60'
              : 'bg-[var(--card-hover)] text-white hover:bg-[var(--accent)] cursor-pointer'
          }`}
        >
          {TEAM_NAMES[awayTeamId] ?? awayTeamId}
          {votedFor && <span className="ml-1.5 opacity-75">{awayPct}%</span>}
        </button>
        <button
          onClick={() => vote('home')}
          disabled={!!votedFor}
          className={`flex-1 rounded-lg py-2 px-3 text-center font-display font-800 text-sm uppercase transition-all ${
            votedFor === 'home'
              ? 'bg-[var(--accent)] text-white'
              : votedFor
              ? 'bg-[var(--card-hover)] text-[var(--muted)] cursor-default opacity-60'
              : 'bg-[var(--card-hover)] text-white hover:bg-[var(--accent)] cursor-pointer'
          }`}
        >
          {TEAM_NAMES[homeTeamId] ?? homeTeamId}
          {votedFor && <span className="ml-1.5 opacity-75">{homePct}%</span>}
        </button>
      </div>
      {votedFor && total > 0 && (
        <div className="mt-2 flex rounded-full overflow-hidden h-1">
          <div
            style={{ width: `${awayPct}%` }}
            className={`h-full transition-all duration-500 ${votedFor === 'away' ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
          />
          <div
            style={{ width: `${homePct}%` }}
            className={`h-full transition-all duration-500 ${votedFor === 'home' ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
          />
        </div>
      )}
    </div>
  )
}
