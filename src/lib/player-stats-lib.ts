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

// ── Public types ──────────────────────────────────────────────────────────────
export type SeasonStats = {
  ab: number; h: number; hr: number; rbi: number; r: number
  bb: number; so: number; double: number; triple: number
  sb: number; sf: number; sh: number; hbp: number
  avg: number | null; obp: number | null; slg: number | null; ops: number | null
  pitch_ip: string; pitch_gs: number; pitch_er: number
  pitch_so: number; pitch_bb: number; pitch_h: number; pitch_r: number
  pitch_win: number; pitch_loss: number; pitch_save: number
  pitch_appear: number; pitch_cg: number
  era: number | null
  games: number
}

export type PlayerPhotos = {
  banner_url: string | null
  headshot_url: string | null
  banner_focal_x: number | null
  banner_focal_y: number | null
} | null

// ── computeSeasonStats — fetches from the same KNBSB API as the leaders page ─
export async function computeSeasonStats(name: string): Promise<SeasonStats | null> {
  const [batCats, pitCats] = await Promise.all([
    fetchKnbsbCategories('batting'),
    fetchKnbsbCategories('pitching'),
  ])

  const bat = findPlayer(batCats, name)
  const pit = findPlayer(pitCats, name)

  if (!bat && !pit) return null

  const obp = bat ? num(bat.obp) : 0
  const slg = bat ? num(bat.slg) : 0

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
    avg:    bat?.avg != null ? Number(Number(bat.avg).toFixed(3)) : null,
    obp:    bat?.obp != null ? Number(obp.toFixed(3)) : null,
    slg:    bat?.slg != null ? Number(slg.toFixed(3)) : null,
    ops:    bat?.obp != null && bat?.slg != null ? Number((obp + slg).toFixed(3)) : null,
    games:  num(bat?.g ?? bat?.pa ?? 0),
    pitch_ip:     fmtIp(pit?.pitch_ip),
    pitch_gs:     num(pit?.pitch_gs),
    pitch_er:     num(pit?.pitch_er),
    pitch_so:     num(pit?.pitch_so),
    pitch_bb:     num(pit?.pitch_bb),
    pitch_h:      num(pit?.pitch_h),
    pitch_r:      num(pit?.pitch_r),
    pitch_win:    num(pit?.pitch_win),
    pitch_loss:   num(pit?.pitch_loss),
    pitch_save:   num(pit?.pitch_save),
    pitch_appear: num(pit?.pitch_appear),
    pitch_cg:     num(pit?.pitch_cg),
    era:          pit?.era != null ? Number(Number(pit.era).toFixed(2)) : null,
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
