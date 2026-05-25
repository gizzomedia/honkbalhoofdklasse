import { supabase } from '@/lib/supabase'

// ── KNBSB stats API (same source as /leaders page) ───────────────────────────
const KNBSB_BASE = 'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index'
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Origin': 'https://stats.knbsbstats.nl',
}

type Row = Record<string, unknown>
type KnbsbCategory = { type: string; label: string; data: Row[] }

// section=players → one row per player with all stats, no minimum threshold
async function fetchAllPlayerStats(section: 'batting' | 'pitching'): Promise<Row[]> {
  try {
    const res = await fetch(
      `${KNBSB_BASE}?section=players&stats-section=${section}&round=&team=&split=&language=en`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Referer: `https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/players/${section}`,
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    const data = (await res.json()).data ?? []
    if (!Array.isArray(data) || data.length === 0) return []
    // If items have a nested 'data' array it's category structure → flatten
    if (Array.isArray((data[0] as KnbsbCategory)?.data)) {
      return (data as KnbsbCategory[]).flatMap(cat => cat.data ?? [])
    }
    return data as Row[]
  } catch {
    return []
  }
}

// section=leaders → used by the leaders page; also a category-based fallback
async function fetchKnbsbCategories(section: 'batting' | 'pitching'): Promise<KnbsbCategory[]> {
  try {
    const res = await fetch(
      `${KNBSB_BASE}?section=leaders&stats-section=${section}&round=&team=&split=&language=en`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Referer: `https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/${section}`,
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    return (await res.json()).data ?? []
  } catch {
    return []
  }
}

const TUSSENVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'aan', 'ten', 'ter', 'in', 'uit', 'over', 't', 'vd', 'la', 'le', 'los', 'del'])

function fmtLast(raw: string): string {
  return raw.split(' ').map((w, i, arr) => {
    const lower = w.toLowerCase()
    if (i < arr.length - 1 && TUSSENVOEGSELS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }).join(' ')
}

function parseKnbsbName(p: Row): string {
  const html = String(p.name ?? '')
  if (html) {
    const parts = html.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) return `${parts[1]} ${fmtLast(parts[0])}`
  }
  const first = String(p.firstname ?? '').split(' ')[0]
  const last = fmtLast(String(p.lastname ?? ''))
  return `${first} ${last}`.trim()
}

function normName(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function findPlayer(categories: KnbsbCategory[], name: string): Row | null {
  const target = normName(name)
  // Merge across ALL categories — each category may only include its own stat columns
  const merged: Row = {}
  for (const cat of categories) {
    const found = (cat.data ?? []).find(p => normName(parseKnbsbName(p)) === target)
    if (found) Object.assign(merged, found)
  }
  return Object.keys(merged).length > 0 ? merged : null
}

function num(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

function fmtIp(v: unknown): string {
  const raw = String(v ?? '')
  if (raw.includes('.')) return raw === '0.0' ? '0.0' : raw
  const n = Number(raw)
  if (isNaN(n) || n === 0) return '0.0'
  return `${Math.floor(n / 3)}.${n % 3}`
}

function ipToInnings(v: unknown): number {
  const raw = String(v ?? '').trim()
  if (!raw || raw === '0' || raw === '0.0') return 0
  if (raw.includes('.')) {
    const [full, outs] = raw.split('.').map(s => Number(s) || 0)
    return full + outs / 3
  }
  const n = Number(raw)
  if (isNaN(n) || n === 0) return 0
  return Math.floor(n / 3) + (n % 3) / 3
}

// ── Public types ──────────────────────────────────────────────────────────────
export type SeasonStats = {
  ab: number; h: number; hr: number; rbi: number; r: number
  bb: number; so: number; double: number; triple: number
  sb: number; sf: number; sh: number; hbp: number
  pa: number; ibb: number; cs: number; gdp: number
  avg: number | null; obp: number | null; slg: number | null; ops: number | null
  pitch_ip: string; pitch_gs: number; pitch_er: number
  pitch_so: number; pitch_bb: number; pitch_h: number; pitch_r: number
  pitch_win: number; pitch_loss: number; pitch_save: number
  pitch_appear: number; pitch_cg: number; pitch_sho: number; pitch_bf: number
  pitch_hr: number; pitch_hbp: number; pitch_ibb: number; pitch_wp: number; pitch_bk: number
  era: number | null; whip: number | null
  games: number
}

export type PlayerPhotos = {
  banner_url: string | null
  headshot_url: string | null
  banner_focal_x: number | null
  banner_focal_y: number | null
} | null

function findInList(players: Row[], name: string): Row | null {
  const target = normName(name)
  return players.find(p => normName(parseKnbsbName(p)) === target) ?? null
}

// ── computeSeasonStats ────────────────────────────────────────────────────────
// Uses section=players (no threshold) for individual pages.
// Falls back to section=leaders categories (for players who appear there but
// have a different name format in section=players).
export async function computeSeasonStats(name: string): Promise<SeasonStats | null> {
  const [batList, pitList, batCats, pitCats] = await Promise.all([
    fetchAllPlayerStats('batting'),
    fetchAllPlayerStats('pitching'),
    fetchKnbsbCategories('batting'),
    fetchKnbsbCategories('pitching'),
  ])

  // Prefer section=players (all players, no threshold)
  let bat: Row | null = findInList(batList, name)
  let pit: Row | null = findInList(pitList, name)

  // Fall back to section=leaders categories (catches edge-case name format diffs)
  if (!bat) bat = findPlayer(batCats, name)
  if (!pit) pit = findPlayer(pitCats, name)

  if (!bat && !pit) return null

  // section=players stores rates as integers (219 = .219); section=leaders uses decimals (0.219)
  function normalizeRate(v: unknown): number | null {
    if (v == null || v === '') return null
    const x = Number(v)
    if (isNaN(x)) return null
    return x > 1 ? x / 1000 : x
  }

  const rawAvg = normalizeRate(bat?.avg)
  const rawObp = normalizeRate(bat?.obp)
  const rawSlg = normalizeRate(bat?.slg)

  const pitBb = num(pit?.pitch_bb)
  const pitH  = num(pit?.pitch_h)
  const pitIp = ipToInnings(pit?.pitch_ip)

  return {
    ab:     num(bat?.ab),
    h:      num(bat?.h),
    hr:     num(bat?.hr),
    rbi:    num(bat?.rbi),
    r:      num(bat?.r),
    bb:     num(bat?.bb),
    so:     num(bat?.so),
    double: num(bat?.double),
    triple: num(bat?.triple),
    sb:     num(bat?.sb),
    sf:     num(bat?.sf),
    sh:     num(bat?.sh),
    hbp:    num(bat?.hbp),
    pa:     num(bat?.pa),
    ibb:    num(bat?.ibb),
    cs:     num(bat?.cs),
    gdp:    num(bat?.gdp),
    avg:    rawAvg != null ? Number(rawAvg.toFixed(3)) : null,
    obp:    rawObp != null ? Number(rawObp.toFixed(3)) : null,
    slg:    rawSlg != null ? Number(rawSlg.toFixed(3)) : null,
    ops:    rawObp != null && rawSlg != null ? Number((rawObp + rawSlg).toFixed(3)) : null,
    games:  num(bat?.g ?? bat?.pa ?? 0),
    pitch_ip:     fmtIp(pit?.pitch_ip),
    pitch_gs:     num(pit?.pitch_gs),
    pitch_er:     num(pit?.pitch_er),
    pitch_so:     num(pit?.pitch_so),
    pitch_bb:     pitBb,
    pitch_h:      pitH,
    pitch_r:      num(pit?.pitch_r),
    pitch_win:    num(pit?.pitch_win),
    pitch_loss:   num(pit?.pitch_loss),
    pitch_save:   num(pit?.pitch_save),
    pitch_appear: num(pit?.pitch_appear),
    pitch_cg:     num(pit?.pitch_cg),
    pitch_sho:    num(pit?.pitch_sho),
    pitch_bf:     num(pit?.pitch_bf),
    pitch_hr:     num(pit?.pitch_hr),
    pitch_hbp:    num(pit?.pitch_hbp),
    pitch_ibb:    num(pit?.pitch_ibb),
    pitch_wp:     num(pit?.pitch_wp),
    pitch_bk:     num(pit?.pitch_bk),
    era:          pit?.era != null ? Number(Number(pit.era).toFixed(2)) : null,
    whip:         pitIp > 0 ? Number(((pitBb + pitH) / pitIp).toFixed(2)) : null,
  }
}

export async function fetchPlayerPhotos(playerName: string): Promise<PlayerPhotos> {
  const { data } = await supabase
    .from('player_photos')
    .select('banner_url, headshot_url, banner_focal_x, banner_focal_y')
    .ilike('player_name', playerName)
    .maybeSingle()
  return data ?? null
}
