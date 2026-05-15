'use client'

import { useState } from 'react'
import type { SeasonStats } from '@/lib/player-stats-lib'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT } from '@/lib/teams'

function fmtAvg(v: number | null, ab: number): string {
  if (ab === 0 || v === null) return '—'
  return v.toFixed(3).replace('0.', '.')
}

function fmtStat(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

function BigStatCard({ label, value, teamColor }: { label: string; value: string; teamColor: string }) {
  return (
    <div className="bg-[#0a1624] rounded-xl p-4 text-center border border-white/10 flex flex-col gap-1">
      <span
        className="font-display font-800 text-3xl leading-none"
        style={{ color: teamColor === '#121b31' ? '#f59e0b' : teamColor }}
      >
        {value}
      </span>
      <span className="font-display font-700 text-[10px] text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  )
}

function TableTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-display font-700 text-[10px] text-white/40 uppercase tracking-widest px-2 py-2 text-center whitespace-nowrap">
      {children}
    </th>
  )
}

function TableTd({ children, highlight, teamColor }: { children: React.ReactNode; highlight?: boolean; teamColor?: string }) {
  return (
    <td
      className="font-display font-700 text-sm px-2 py-2.5 text-center whitespace-nowrap"
      style={highlight && teamColor ? { color: teamColor === '#121b31' ? '#f59e0b' : teamColor } : { color: 'rgba(255,255,255,0.85)' }}
    >
      {children}
    </td>
  )
}

export default function StatsTabs({
  stats,
  teamId,
}: {
  stats: SeasonStats
  teamId: string
}) {
  const hasPitching = stats.pitch_appear > 0
  const [tab, setTab] = useState<'batting' | 'pitching'>('batting')
  const teamColor = TEAM_COLORS[teamId] ?? '#3d68e9'

  const activeStyle = {
    borderBottomColor: teamColor === '#121b31' ? '#f59e0b' : teamColor,
    color: 'white',
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => setTab('batting')}
          className={`font-display font-800 text-xs uppercase tracking-widest px-5 py-3 border-b-2 transition-colors ${tab === 'batting' ? 'border-b-2' : 'border-transparent text-white/40 hover:text-white/70'}`}
          style={tab === 'batting' ? activeStyle : { borderBottomColor: 'transparent' }}
        >
          Batting
        </button>
        {hasPitching && (
          <button
            onClick={() => setTab('pitching')}
            className={`font-display font-800 text-xs uppercase tracking-widest px-5 py-3 border-b-2 transition-colors ${tab === 'pitching' ? 'border-b-2' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={tab === 'pitching' ? activeStyle : { borderBottomColor: 'transparent' }}
          >
            Pitching
          </button>
        )}
      </div>

      {tab === 'batting' && (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <BigStatCard label="AVG" value={fmtAvg(stats.avg, stats.ab)} teamColor={teamColor} />
            <BigStatCard label="HR"  value={fmtStat(stats.hr)}            teamColor={teamColor} />
            <BigStatCard label="RBI" value={fmtStat(stats.rbi)}           teamColor={teamColor} />
            <BigStatCard label="OPS" value={stats.ops !== null ? stats.ops.toFixed(3) : '—'} teamColor={teamColor} />
          </div>

          {/* Full batting table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <TableTh>GP</TableTh>
                  <TableTh>AB</TableTh>
                  <TableTh>H</TableTh>
                  <TableTh>R</TableTh>
                  <TableTh>2B</TableTh>
                  <TableTh>3B</TableTh>
                  <TableTh>HR</TableTh>
                  <TableTh>RBI</TableTh>
                  <TableTh>BB</TableTh>
                  <TableTh>SO</TableTh>
                  <TableTh>SB</TableTh>
                  <TableTh>OBP</TableTh>
                  <TableTh>SLG</TableTh>
                  <TableTh>OPS</TableTh>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <TableTd>{fmtStat(stats.games)}</TableTd>
                  <TableTd>{fmtStat(stats.ab)}</TableTd>
                  <TableTd>{fmtStat(stats.h)}</TableTd>
                  <TableTd>{fmtStat(stats.r)}</TableTd>
                  <TableTd>{fmtStat(stats.double)}</TableTd>
                  <TableTd>{fmtStat(stats.triple)}</TableTd>
                  <TableTd>{fmtStat(stats.hr)}</TableTd>
                  <TableTd>{fmtStat(stats.rbi)}</TableTd>
                  <TableTd>{fmtStat(stats.bb)}</TableTd>
                  <TableTd>{fmtStat(stats.so)}</TableTd>
                  <TableTd>{fmtStat(stats.sb)}</TableTd>
                  <TableTd highlight teamColor={teamColor}>{stats.obp !== null ? stats.obp.toFixed(3) : '—'}</TableTd>
                  <TableTd highlight teamColor={teamColor}>{stats.slg !== null ? stats.slg.toFixed(3) : '—'}</TableTd>
                  <TableTd highlight teamColor={teamColor}>{stats.ops !== null ? stats.ops.toFixed(3) : '—'}</TableTd>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'pitching' && hasPitching && (
        <>
          {/* Key pitching stats */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <BigStatCard label="ERA" value={stats.era !== null ? stats.era.toFixed(2) : '—'} teamColor={teamColor} />
            <BigStatCard label="IP"  value={stats.pitch_ip}                                  teamColor={teamColor} />
            <BigStatCard label="SO"  value={fmtStat(stats.pitch_so)}                         teamColor={teamColor} />
            <BigStatCard
              label="W-L"
              value={`${fmtStat(stats.pitch_win)}-${fmtStat(stats.pitch_loss)}`}
              teamColor={teamColor}
            />
          </div>

          {/* Full pitching table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <TableTh>GP</TableTh>
                  <TableTh>GS</TableTh>
                  <TableTh>IP</TableTh>
                  <TableTh>W</TableTh>
                  <TableTh>L</TableTh>
                  <TableTh>SV</TableTh>
                  <TableTh>H</TableTh>
                  <TableTh>R</TableTh>
                  <TableTh>ER</TableTh>
                  <TableTh>BB</TableTh>
                  <TableTh>SO</TableTh>
                  <TableTh>ERA</TableTh>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <TableTd>{fmtStat(stats.pitch_appear)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_gs)}</TableTd>
                  <TableTd>{stats.pitch_ip}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_win)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_loss)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_save)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_h)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_r)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_er)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_bb)}</TableTd>
                  <TableTd>{fmtStat(stats.pitch_so)}</TableTd>
                  <TableTd highlight teamColor={teamColor}>
                    {stats.era !== null ? stats.era.toFixed(2) : '—'}
                  </TableTd>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
