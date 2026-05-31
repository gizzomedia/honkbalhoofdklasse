'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { StaticRosters } from '@/lib/rosters-data'
import PlayerStatsModal from '@/components/PlayerStatsModal'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT } from '@/lib/teams'

const TEAM_ORDER = ['neptunus', 'pirates', 'kinheim', 'hcaw', 'twins', 'pioniers', 'uvv']

type Section = { label: string; short: string; filter: (pos: string) => boolean }

const SECTIONS: Section[] = [
  { label: 'Pitchers',        short: 'P',   filter: pos => pos === 'P' },
  { label: 'Catchers',        short: 'C',   filter: pos => pos === 'C' },
  { label: 'Infield',         short: 'IF',  filter: pos => pos === 'IF' || pos === 'C/IF' },
  { label: 'Outfield',        short: 'OF',  filter: pos => pos === 'OF' },
  { label: 'Utility',         short: 'UTL', filter: pos => pos === 'UTL' || pos === 'DH' },
]

type SelectedPlayer = { name: string; teamId: string; statType: 'batting' | 'pitching' }

type NewPlayer = { name: string; pos: string; uniform: string; bt: string; yob: number }

export default function RosterTabs({ rosters }: { rosters: StaticRosters }) {
  const availableTeams = TEAM_ORDER.filter(t => rosters[t])
  const [activeTeam, setActiveTeam] = useState(availableTeams[0] ?? '')
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null)
  const [newPlayers, setNewPlayers] = useState<NewPlayer[]>([])
  const [loadedTeam, setLoadedTeam] = useState('')

  const loadSupplemental = useCallback((teamId: string) => {
    if (loadedTeam === teamId) return
    fetch(`/api/roster-supplement/${teamId}`)
      .then(r => r.json())
      .then((data: NewPlayer[]) => { setNewPlayers(data); setLoadedTeam(teamId) })
      .catch(() => {})
  }, [loadedTeam])

  useEffect(() => { loadSupplemental(activeTeam) }, [activeTeam, loadSupplemental])

  const team = rosters[activeTeam]
  const staticPlayers = team?.players ?? []
  const knownNames = new Set(staticPlayers.map(p => p.name.toLowerCase()))
  const supplemental = newPlayers.filter(p => !knownNames.has(p.name.toLowerCase()))
  const players = [...staticPlayers, ...supplemental]
  const coaches = team?.coaches ?? []
  const color = TEAM_COLORS[activeTeam] ?? '#1e335a'

  return (
    <>
    {selectedPlayer && (
      <PlayerStatsModal
        playerName={selectedPlayer.name}
        teamId={selectedPlayer.teamId}
        statType={selectedPlayer.statType}
        onClose={() => setSelectedPlayer(null)}
      />
    )}
    <div className="space-y-6">
      {/* Team tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {availableTeams.map(teamId => {
            const active = teamId === activeTeam
            const tc = TEAM_COLORS[teamId] ?? '#1e335a'
            return (
              <button
                key={teamId}
                onClick={() => setActiveTeam(teamId)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wide transition-all shrink-0 ${
                  active ? 'text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-white'
                }`}
                style={active ? { backgroundColor: tc } : {}}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0 p-0.5"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.2)' : tc }}
                >
                  <Image
                    src={TEAM_LOGOS[teamId]}
                    alt={teamId}
                    width={20}
                    height={20}
                    className="object-contain w-full h-full"
                  />
                </div>
                <span className="hidden sm:inline">{TEAM_NAMES[teamId]}</span>
                <span className="sm:hidden">{teamId.slice(0, 3).toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Player sections */}
      <div className="space-y-6">
        {SECTIONS.map(section => {
          const sectionPlayers = players
            .filter(p => section.filter(p.pos))
            .sort((a, b) => (Number(a.uniform) || 99) - (Number(b.uniform) || 99))
          if (sectionPlayers.length === 0) return null

          return (
            <div key={section.short}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <span className="font-display font-800 text-white text-xs">{section.short}</span>
                </div>
                <div>
                  <h2 className="font-display font-800 italic text-2xl uppercase text-white leading-none">
                    <strong>{section.label}</strong>
                  </h2>
                  <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                    {sectionPlayers.length} player{sectionPlayers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center px-3 py-2 w-10">#</th>
                      <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-left px-3 py-2">Name</th>
                      <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center px-3 py-2 w-14">POS</th>
                      <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center px-3 py-2 w-14">B/T</th>
                      <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center px-3 py-2 w-14">YOB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionPlayers.map((player, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedPlayer({ name: player.name, teamId: activeTeam, statType: player.pos === 'P' ? 'pitching' : 'batting' })}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)] transition-colors group cursor-pointer"
                      >
                        <td className="font-display font-800 text-sm text-center px-3 py-2.5 w-10 text-white">
                          {player.uniform || '–'}
                        </td>
                        <td className="font-display font-800 text-base text-white px-3 py-2.5 group-hover:text-[var(--accent)] transition-colors">
                          {player.name}
                        </td>
                        <td className="text-center px-3 py-2.5 w-14">
                          <span
                            className="font-display font-800 text-[10px] px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: color }}
                          >
                            {player.pos}
                          </span>
                        </td>
                        <td className="font-display font-700 text-xs text-[var(--muted)] text-center px-3 py-2.5 w-14">
                          {player.bt}
                        </td>
                        <td className="font-display font-700 text-xs text-[var(--muted)] text-center px-3 py-2.5 w-14">
                          {player.yob}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* Coaching Staff */}
        {coaches.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                <span className="font-display font-800 text-white text-[9px]">STF</span>
              </div>
              <div>
                <h2 className="font-display font-800 italic text-2xl uppercase text-white leading-none">
                  <strong>Coaching Staff</strong>
                </h2>
                <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                  {coaches.length} staff member{coaches.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center px-3 py-2 w-10">#</th>
                    <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-left px-3 py-2">Name</th>
                    <th className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-left px-3 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)] transition-colors"
                    >
                      <td className="font-display font-800 text-sm text-center px-3 py-2.5 w-10 text-white">
                        {coach.uniform || '–'}
                      </td>
                      <td className="font-display font-800 text-sm text-white px-3 py-2.5">
                        {coach.name}
                      </td>
                      <td className="font-display font-700 text-xs text-[var(--muted)] px-3 py-2.5">
                        {coach.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
