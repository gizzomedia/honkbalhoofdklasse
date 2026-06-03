'use client'

import { useState, useEffect } from 'react'
import PlayerStatsModal from '@/components/PlayerStatsModal'
import { TEAM_COLORS, TEAM_SHORT, KNBSB_TEAM_MAP } from '@/lib/teams'

const LABEL_OVERRIDE: Record<string, string> = {
  PITCH_APPEAR: 'App', PITCH_SHO: 'SHO', PITCH_SHA: 'SHA',
  PITCH_SFA: 'SFA', PITCH_WP: 'WP', PITCH_HBP: 'HBP',
  PITCH_IBB: 'IBB', PITCH_BK: 'BK',
}

type Row = Record<string, unknown>
type Period = 'week' | 'month' | 'season'
type Category = 'hitting' | 'pitching'
type OnSelect = (name: string, teamId: string, statType: 'batting' | 'pitching') => void

export type KnbsbCategory = {
  type: string
  label: string
  data: Row[]
}

export type SeasonLeaders = {
  batting: KnbsbCategory[]
  pitching: KnbsbCategory[]
}

export type TabData = {
  batters: Row[]           // all batters with ≥1 AB (for HR/RBI/SB tables)
  battingQualified?: Row[] // 2.7 PA/G qualified batters (for AVG table only)
  pitchers: Row[]
}

function parseLabel(raw: string): { stat: string; qualifier: string | null } {
  if (LABEL_OVERRIDE[raw]) return { stat: LABEL_OVERRIDE[raw], qualifier: null }
  const match = raw.match(/^(.+?)(?:\s+\((.+?)\))?$/)
  return { stat: match?.[1]?.trim() ?? raw, qualifier: match?.[2] ?? null }
}

function formatIp(v: unknown): string {
  const n = Number(v)
  if (!n && n !== 0) return '-'
  if (Number.isInteger(n)) return `${Math.floor(n / 3)}.${n % 3}`
  return n.toFixed(1)
}

function getStatValue(type: string, p: Row): string {
  const s = (v: unknown) => (v != null && v !== '' ? String(v) : '-')
  const map: Record<string, () => string> = {
    avg: () => s(p.avg), slg: () => s(p.slg), obp: () => s(p.obp),
    bavg: () => s(p.bavg),
    r: () => s(p.r), h: () => s(p.h), rbi: () => s(p.rbi),
    double: () => s(p.double), triple: () => s(p.triple), hr: () => s(p.hr),
    bb: () => s(p.bb), hbp: () => s(p.hbp), sh: () => s(p.sh), sf: () => s(p.sf),
    sb: () => s(p.sb), pa: () => s(p.pa), ab: () => s(p.ab), cs: () => s(p.cs),
    so: () => s(p.so), kl: () => s(p.kl), gdp: () => s(p.gdp),
    era: () => s(p.era),
    pitch_ip: () => formatIp(p.pitch_ip),
    pitch_er: () => s(p.pitch_er), pitch_bb: () => s(p.pitch_bb),
    pitch_so: () => s(p.pitch_so), pitch_win: () => s(p.pitch_win),
    pitch_save: () => s(p.pitch_save), pitch_appear: () => s(p.pitch_appear),
    pitch_gs: () => s(p.pitch_gs), pitch_cg: () => s(p.pitch_cg),
    pitch_sho: () => s(p.pitch_sho), pitch_sha: () => s(p.pitch_sha),
    pitch_sfa: () => s(p.pitch_sfa), pitch_loss: () => s(p.pitch_loss),
    pitch_wp: () => s(p.pitch_wp), pitch_hbp: () => s(p.pitch_hbp),
    pitch_ibb: () => s(p.pitch_ibb), pitch_h: () => s(p.pitch_h),
    pitch_r: () => s(p.pitch_r), pitch_ab: () => s(p.pitch_ab),
    pitch_ground: () => s(p.pitch_ground), pitch_fly: () => s(p.pitch_fly),
    pitch_bk: () => s(p.pitch_bk),
  }
  return map[type]?.() ?? '-'
}

function assignRanks(players: Row[]): string[] {
  const positions: (number | '-')[] = players.map(p => {
    const pos = p.position
    return (pos === '-' || pos === undefined) ? '-' : Number(pos)
  })
  const hasTie = new Set<number>()
  let lastNum = 1
  for (const pos of positions) {
    if (pos === '-') hasTie.add(lastNum)
    else lastNum = pos
  }
  lastNum = 1
  return positions.map(pos => {
    if (pos === '-') return `T${lastNum}`
    lastNum = pos
    return hasTie.has(lastNum) ? `T${lastNum}` : String(lastNum)
  })
}

const TUSSENVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'aan', 'ten', 'ter', 'in', 'uit', 'over', "t", 'vd', 'la', 'le', 'los', 'del'])

function formatDutchLastname(raw: string): string {
  const words = raw.split(' ')
  return words.map((word, i) => {
    const lower = word.toLowerCase()
    if (i < words.length - 1 && TUSSENVOEGSELS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }).join(' ')
}

function formatFullName(full: string): string {
  const words = full.trim().split(/\s+/)
  if (words.length === 0) return full
  const first = words[0].toLowerCase()
  const firstCapitalized = first.charAt(0).toUpperCase() + first.slice(1)
  if (words.length === 1) return firstCapitalized
  return `${firstCapitalized} ${formatDutchLastname(words.slice(1).join(' '))}`
}

function parseKnbsbName(player: Row): string {
  const nameHtml = String(player.name ?? '')
  if (nameHtml) {
    const parts = nameHtml.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) return `${parts[1]} ${formatDutchLastname(parts[0])}`
  }
  const first = String(player.firstname ?? '').split(' ')[0]
  const last = formatDutchLastname(String(player.lastname ?? ''))
  return `${first} ${last}`.trim()
}

function CategoryCard({ category, statType, onSelect }: {
  category: KnbsbCategory
  statType: 'batting' | 'pitching'
  onSelect: OnSelect
}) {
  const { stat, qualifier } = parseLabel(category.label)
  const ranks = assignRanks(category.data)
  const gridCols = '1.5rem 1fr 3.5rem'

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display font-800 italic text-2xl uppercase text-white"><strong>{stat}</strong></h2>
          {qualifier && (
            <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">{qualifier}</span>
          )}
        </div>
        {category.type === 'sb' && (
          <div className="h-7 w-14 flex items-center justify-end shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://res.cloudinary.com/dqld625sq/image/upload/v1778604074/SSK_LOGO_hiu1wg.png" alt="SSK" className="max-h-full max-w-full object-contain opacity-90" />
          </div>
        )}
      </div>
      {category.data.length === 0 ? (
        <p className="px-5 py-3 font-display font-700 text-[var(--muted)] text-sm uppercase">No data</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {category.data.map((player, i) => {
            const rank = ranks[i]
            const isFirst = rank === '1' || rank === 'T1'
            const teamKey = KNBSB_TEAM_MAP[String(player.team ?? '')] ?? ''
            const name = parseKnbsbName(player)
            const value = getStatValue(category.type, player)

            return (
              <button
                key={i}
                onClick={() => onSelect(name, teamKey, statType)}
                className={`w-full grid items-center px-5 py-2.5 gap-3 transition-colors text-left ${
                  isFirst ? 'bg-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'
                }`}
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className={`font-display font-800 text-lg ${isFirst ? 'text-white' : 'text-[var(--muted)]'}`}>
                  {rank}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="font-display font-800 text-xs px-1.5 py-0.5 rounded text-white shrink-0"
                    style={{ backgroundColor: isFirst ? 'rgba(255,255,255,0.25)' : (TEAM_COLORS[teamKey] ?? '#1e335a') }}
                  >
                    <strong>{TEAM_SHORT[teamKey] ?? String(player.team ?? '').slice(0, 3)}</strong>
                  </span>
                  <p className="font-display font-800 text-[1.2rem] uppercase leading-none truncate text-white">
                    <span className="hidden sm:inline"><strong>{name.split(' ')[0]} </strong></span>
                    <strong>{name.split(' ').slice(1).join(' ')}</strong>
                  </p>
                </div>
                <p className={`font-display font-800 text-lg text-center ${isFirst ? 'text-white' : 'text-[var(--accent)]'}`}>
                  <strong>{value}</strong>
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeasonCategoryGrid({ categories, statType, onSelect }: {
  categories: KnbsbCategory[]
  statType: 'batting' | 'pitching'
  onSelect: OnSelect
}) {
  if (categories.length === 0) {
    return <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest py-10 text-center">No data available</p>
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map(cat => (
        <CategoryCard key={cat.type} category={cat} statType={statType} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ── Week (serie) tables ──────────────────────────────────────────────────────

type Col<T> = { label: string; value: (r: T) => string | number }

function LeaderTable<T extends Row>({ title, rows, columns, statType, onSelect }: {
  title: string
  rows: T[]
  columns: Col<T>[]
  statType: 'batting' | 'pitching'
  onSelect: OnSelect
}) {
  const gridCols = `1rem 1fr ${columns.map(() => '3rem').join(' ')}`

  if (rows.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="font-display font-800 italic text-2xl uppercase text-white mb-2"><strong>{title}</strong></h2>
        <p className="font-display text-[var(--muted)] text-sm uppercase">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="grid items-center px-3 sm:px-5 pt-4 pb-2 gap-2 sm:gap-3" style={{ gridTemplateColumns: gridCols }}>
        <span />
        <div className="flex items-baseline gap-1.5">
          {(() => { const m = title.match(/^(.+?)(?:\s+\((.+?)\))?$/); const stat = m?.[1] ?? title; const qual = m?.[2]; return (<>
            <h2 className="font-display font-800 italic text-xl sm:text-2xl uppercase text-white"><strong>{stat}</strong></h2>
            {qual && <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider hidden sm:inline">{qual}</span>}
          </>); })()}
        </div>
        {columns.map((col, ci) => (
          <p key={ci} className="font-display font-800 text-xs text-[var(--muted)] uppercase tracking-wider text-center">
            {col.label}
          </p>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.slice(0, 10).map((row, i) => {
          const isLeader = i === 0
          return (
            <button
              key={i}
              onClick={() => onSelect(String(row.full_name ?? ''), String(row.team_id ?? ''), statType)}
              className={`w-full grid items-center px-3 sm:px-5 py-2 sm:py-2.5 gap-2 sm:gap-3 transition-colors text-left ${isLeader ? 'bg-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'}`}
              style={{ gridTemplateColumns: gridCols }}
            >
              <span className={`font-display font-800 text-base ${isLeader ? 'text-white' : 'text-[var(--muted)]'}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  className="font-display font-800 text-[10px] px-1 sm:px-1.5 py-0.5 rounded text-white shrink-0"
                  style={{ backgroundColor: isLeader ? 'rgba(255,255,255,0.25)' : (TEAM_COLORS[row.team_id as string] ?? '#1e335a') }}
                >
                  <strong>{TEAM_SHORT[row.team_id as string] ?? String(row.team_id ?? '').slice(0, 3).toUpperCase()}</strong>
                </span>
                {(() => { const fn = formatFullName(String(row.full_name ?? '')); return (
                  <p className="font-display font-800 text-sm sm:text-[1.1rem] uppercase leading-none truncate text-white">
                    <span className="hidden sm:inline"><strong>{fn.split(' ')[0]} </strong></span>
                    <strong>{fn.split(' ').slice(1).join(' ')}</strong>
                  </p>
                )})()}
              </div>
              {columns.map((col, ci) => {
                const isLast = ci === columns.length - 1
                return (
                  <p key={ci} className={`font-display font-800 text-sm sm:text-base text-center ${isLeader ? 'text-white' : isLast ? 'text-[var(--accent)]' : 'text-white'}`}>
                    <strong>{col.value(row)}</strong>
                  </p>
                )
              })}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const fmt     = (v: unknown) => v != null ? String(v) : '-'
const fmtRate = (v: unknown) => v != null ? Number(v).toFixed(3).replace('0.', '.') : '-'
const fmtIp   = (v: unknown) => v != null ? String(v) : '-'

function ipToDec(v: unknown): number {
  const s = String(v ?? '0')
  if (s.includes('.')) {
    const [f, o] = s.split('.').map(n => parseInt(n, 10) || 0)
    return f + o / 3
  }
  return (parseInt(s, 10) || 0) * 3  // integer = full innings
}

function WeekHittingTables({ batters, battingQualified, avgTitle, onSelect }: { batters: Row[]; battingQualified?: Row[]; avgTitle?: string; onSelect: OnSelect }) {
  const byHR  = [...batters].sort((a, b) => (b.home_runs as number) - (a.home_runs as number))
  const byRBI = [...batters].sort((a, b) => (b.rbi as number) - (a.rbi as number))
  const bySB  = [...batters].sort((a, b) => (b.stolen_bases as number) - (a.stolen_bases as number))
  const byH   = [...batters].sort((a, b) => (b.hits as number) - (a.hits as number))
  const byOBP = [...batters].filter(r => r.obp != null && Number(r.obp) > 0).sort((a, b) => Number(b.obp) - Number(a.obp))
  const avgRows = battingQualified ?? batters
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LeaderTable title={avgTitle ?? 'Batting Avg'} rows={avgRows} statType="batting" onSelect={onSelect} columns={[
        { label: 'AB',  value: r => fmt(r.at_bats) },
        { label: 'H',   value: r => fmt(r.hits) },
        { label: 'AVG', value: r => fmtRate(r.avg) },
      ]} />
      <LeaderTable title="OBP" rows={byOBP} statType="batting" onSelect={onSelect} columns={[
        { label: 'AB',  value: r => fmt(r.at_bats) },
        { label: 'OBP', value: r => fmtRate(r.obp) },
      ]} />
      <LeaderTable title="Home Runs" rows={byHR} statType="batting" onSelect={onSelect} columns={[
        { label: 'AB', value: r => fmt(r.at_bats) },
        { label: 'HR', value: r => fmt(r.home_runs) },
      ]} />
      <LeaderTable title="RBI" rows={byRBI} statType="batting" onSelect={onSelect} columns={[
        { label: 'AB',  value: r => fmt(r.at_bats) },
        { label: 'RBI', value: r => fmt(r.rbi) },
      ]} />
      <LeaderTable title="Hits" rows={byH} statType="batting" onSelect={onSelect} columns={[
        { label: 'AB', value: r => fmt(r.at_bats) },
        { label: 'H',  value: r => fmt(r.hits) },
      ]} />
      <LeaderTable title="Stolen Bases" rows={bySB} statType="batting" onSelect={onSelect} columns={[
        { label: 'SB', value: r => fmt(r.stolen_bases) },
      ]} />
    </div>
  )
}

function WeekPitchingTables({ pitchers, onSelect }: { pitchers: Row[]; onSelect: OnSelect }) {
  const byK   = [...pitchers].sort((a, b) => (b.strikeouts as number) - (a.strikeouts as number))
  const byW   = [...pitchers].sort((a, b) => (b.wins as number) - (a.wins as number))
  const bySV  = [...pitchers].sort((a, b) => (b.saves as number) - (a.saves as number))
  const byIP  = [...pitchers].sort((a, b) => ipToDec(b.innings_pitched) - ipToDec(a.innings_pitched))
  const byERA = [...pitchers]
    .filter(p => ipToDec(p.innings_pitched) >= 1)
    .sort((a, b) => {
      const eraA = Number(a.earned_runs ?? 0) / ipToDec(a.innings_pitched) * 9
      const eraB = Number(b.earned_runs ?? 0) / ipToDec(b.innings_pitched) * 9
      return eraA - eraB // ascending: lower ERA is better
    })
  const byWHIP = [...pitchers]
    .filter(p => ipToDec(p.innings_pitched) >= 1)
    .sort((a, b) => {
      const whipA = (Number(a.walks ?? 0) + Number(a.hits_allowed ?? 0)) / ipToDec(a.innings_pitched)
      const whipB = (Number(b.walks ?? 0) + Number(b.hits_allowed ?? 0)) / ipToDec(b.innings_pitched)
      return whipA - whipB // ascending: lower WHIP is better
    })

  const fmtERA  = (r: Row) => ipToDec(r.innings_pitched) > 0 ? (Number(r.earned_runs ?? 0) / ipToDec(r.innings_pitched) * 9).toFixed(2) : '-'
  const fmtWHIP = (r: Row) => ipToDec(r.innings_pitched) > 0 ? ((Number(r.walks ?? 0) + Number(r.hits_allowed ?? 0)) / ipToDec(r.innings_pitched)).toFixed(2) : '-'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LeaderTable title="Strikeouts" rows={byK} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP', value: r => fmtIp(r.innings_pitched) },
        { label: 'K',  value: r => fmt(r.strikeouts) },
      ]} />
      <LeaderTable title="ERA" rows={byERA} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP',  value: r => fmtIp(r.innings_pitched) },
        { label: 'ERA', value: r => fmtERA(r) },
      ]} />
      <LeaderTable title="WHIP" rows={byWHIP} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP',  value: r => fmtIp(r.innings_pitched) },
        { label: 'WHIP', value: r => fmtWHIP(r) },
      ]} />
      <LeaderTable title="Wins" rows={byW} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP', value: r => fmtIp(r.innings_pitched) },
        { label: 'W',  value: r => fmt(r.wins) },
      ]} />
      <LeaderTable title="Saves" rows={bySV} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP', value: r => fmtIp(r.innings_pitched) },
        { label: 'SV', value: r => fmt(r.saves) },
      ]} />
      <LeaderTable title="Innings Pitched" rows={byIP} statType="pitching" onSelect={onSelect} columns={[
        { label: 'IP', value: r => fmtIp(r.innings_pitched) },
        { label: 'K',  value: r => fmt(r.strikeouts) },
      ]} />
    </div>
  )
}

function TabButton({ active, disabled, onClick, children }: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display font-800 uppercase text-sm px-5 py-2.5 rounded-xl transition-all ${
        active
          ? 'bg-[var(--accent)] text-white'
          : disabled
          ? 'bg-[var(--card)] border border-[var(--border)] text-[var(--border)] cursor-not-allowed'
          : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatMonth(ym: string): string {
  const [year, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${year}`
}

function currentMonthPrefix(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function LeadersTabs({
  week,
  season,
  seriesLabel,
  month,
  monthLabel,
  availableMonths,
}: {
  week: TabData | null
  season: SeasonLeaders
  seriesLabel: string | null
  month: TabData
  monthLabel: string
  availableMonths: string[]
}) {
  const [period, setPeriod] = useState<Period>('season')
  const [category, setCategory] = useState<Category>('hitting')
  const [selectedPlayer, setSelectedPlayer] = useState<{
    name: string; teamId: string; statType: 'batting' | 'pitching'
  } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthPrefix)
  const [monthData, setMonthData] = useState<TabData>(month)
  const [loadingMonth, setLoadingMonth] = useState(false)

  useEffect(() => {
    const cur = currentMonthPrefix()
    if (selectedMonth === cur) { setMonthData(month); return }
    setLoadingMonth(true)
    fetch(`/api/leaders/month?month=${selectedMonth}`)
      .then(r => r.json())
      .then(data => { setMonthData(data); setLoadingMonth(false) })
      .catch(() => setLoadingMonth(false))
  }, [selectedMonth, month])

  const onSelect: OnSelect = (name, teamId, statType) => {
    setSelectedPlayer({ name, teamId, statType })
  }

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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap items-center">
            <TabButton active={period === 'week'} disabled={!week} onClick={() => setPeriod('week')}>
              {seriesLabel ?? 'This Week'}
            </TabButton>
            <div className="flex items-center gap-1">
              <TabButton active={period === 'month'} onClick={() => setPeriod('month')}>
                This Month
              </TabButton>
              {period === 'month' && availableMonths.length > 1 && (
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="font-display font-700 text-xs uppercase bg-[var(--card)] border border-[var(--border)] text-white rounded-xl px-3 py-2.5 cursor-pointer outline-none hover:border-white/30 transition-colors"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
              )}
            </div>
            <TabButton active={period === 'season'} onClick={() => setPeriod('season')}>
              Season 2026
            </TabButton>
          </div>
          <div className="flex gap-2">
            <TabButton active={category === 'hitting'} onClick={() => setCategory('hitting')}>
              Hitting
            </TabButton>
            <TabButton active={category === 'pitching'} onClick={() => setCategory('pitching')}>
              Pitching
            </TabButton>
          </div>
        </div>

        {period === 'season' && category === 'hitting'   && <SeasonCategoryGrid categories={season.batting}   statType="batting"  onSelect={onSelect} />}
        {period === 'season' && category === 'pitching'  && <SeasonCategoryGrid categories={season.pitching}  statType="pitching" onSelect={onSelect} />}
        {period === 'week'   && week && category === 'hitting'  && <WeekHittingTables  batters={week.batters}   onSelect={onSelect} />}
        {period === 'week'   && week && category === 'pitching' && <WeekPitchingTables pitchers={week.pitchers} onSelect={onSelect} />}
        {period === 'month' && loadingMonth && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest">Loading…</p>
          </div>
        )}
        {period === 'month' && !loadingMonth && category === 'hitting' && (
          monthData.batters.length > 0
            ? <WeekHittingTables batters={monthData.batters} battingQualified={monthData.battingQualified} avgTitle="Batting Avg (min 1.5 PA/G)" onSelect={onSelect} />
            : <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest">{formatMonth(selectedMonth)} — No data yet</p>
              </div>
        )}
        {period === 'month' && !loadingMonth && category === 'pitching' && (
          monthData.pitchers.length > 0
            ? <WeekPitchingTables pitchers={monthData.pitchers} onSelect={onSelect} />
            : <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest">{formatMonth(selectedMonth)} — No data yet</p>
              </div>
        )}
      </div>
    </>
  )
}
