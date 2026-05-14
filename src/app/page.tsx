import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import HeroSlideshow from '@/components/HeroSlideshow'

export const revalidate = 120

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
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'NEP', pirates: 'PIR', kinheim: 'KIN',
  hcaw: 'HCA', twins: 'TWI', pioniers: 'PIO', uvv: 'UVV',
}

type NewsItem = { title: string; link: string }
type LeaderEntry = { name: string; team: string; value: string }
type MiniLeaders = { batters: LeaderEntry[]; pitchers: LeaderEntry[] }

const KNBSB_TEAM_MAP: Record<string, string> = {
  NEP: 'Neptunus', AMS: 'Pirates', PIR: 'Pirates', HCA: 'HCAW',
  KIN: 'Kinheim', PIO: 'Pioniers', UVV: 'UVV', TWI: 'Twins',
}
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      'https://honkbalsoftbal.nl/wp-json/wp/v2/posts?categories=544&per_page=3&_fields=title,link',
      { next: { revalidate: 1800 } }
    )
    const data = await res.json()
    return (data as { title: { rendered: string }; link: string }[]).map(p => ({
      title: p.title.rendered.replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&#8217;/g, "'"),
      link: p.link,
    }))
  } catch { return [] }
}

async function getMiniLeaders(): Promise<MiniLeaders> {
  try {
    const [batRes, pitRes] = await Promise.all([
      fetch('https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=batting&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/batting' }, next: { revalidate: 3600 } }),
      fetch('https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=pitching&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/pitching' }, next: { revalidate: 3600 } }),
    ])
    const batData = (await batRes.json()).data ?? []
    const pitData = (await pitRes.json()).data ?? []
    const avgCat = batData.find((c: { type: string }) => c.type === 'avg')?.data ?? []
    const eraCat = pitData.find((c: { type: string }) => c.type === 'era')?.data ?? []
    const toEntry = (p: Record<string, unknown>, value: string): LeaderEntry => ({
      name: String(p.lastname ?? '').charAt(0) + String(p.lastname ?? '').slice(1).toLowerCase(),
      team: KNBSB_TEAM_MAP[String(p.team)] ?? String(p.team),
      value,
    })
    return {
      batters:  avgCat.slice(0, 4).map((p: Record<string, unknown>) => toEntry(p, String(p.avg ?? ''))),
      pitchers: eraCat.slice(0, 4).map((p: Record<string, unknown>) => toEntry(p, String(p.era ?? ''))),
    }
  } catch { return { batters: [], pitchers: [] } }
}

async function getData() {
  const today = new Date().toISOString().split('T')[0]
  const [standRes, resultsRes, upcomingRes, mediaRes, news, leaders] = await Promise.all([
    supabase.from('standings').select('*').eq('season', 2026).order('wins', { ascending: false }).order('win_pct', { ascending: false }),
    supabase.from('games').select('*').eq('status', 'final').order('game_date', { ascending: false }).limit(6),
    supabase.from('games').select('*').eq('status', 'scheduled').gte('game_date', today).order('game_date', { ascending: true }).limit(3),
    supabase.from('media').select('id,type,title,url,thumbnail_url,published_at').order('published_at', { ascending: false }).limit(8),
    getNews(),
    getMiniLeaders(),
  ])
  return {
    standings: standRes.data ?? [],
    results: resultsRes.data ?? [],
    upcoming: upcomingRes.data ?? [],
    media: mediaRes.data ?? [],
    news,
    leaders,
  }
}

function TeamLogo({ teamId, size = 40 }: { teamId: string; size?: number }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0 p-1.5"
      style={{ backgroundColor: color, width: size, height: size }}>
      {logo
        ? <Image src={logo} alt={teamId} width={size - 8} height={size - 8} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white" style={{ fontSize: size * 0.25 }}>{TEAM_SHORT[teamId] ?? teamId.slice(0,3).toUpperCase()}</span>
      }
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
      <span className="font-display font-800 italic text-3xl md:text-4xl uppercase text-white tracking-tight">
        <strong>{children}</strong>
      </span>
    </div>
  )
}

export default async function HomePage() {
  const { standings, results, upcoming, media, news, leaders } = await getData()
  const nextGame = upcoming[0]
  const leader = standings[0]
  const standingsMap = Object.fromEntries(standings.map(s => [s.team_id, s]))

  return (
    <div>

      {/* ── HERO ── */}
      <HeroSlideshow />

      {/* ── NEWS TICKER ── */}
      {news.length > 0 && (
        <div className="bg-[var(--accent)] flex items-stretch overflow-hidden">
          <div className="shrink-0 bg-black/20 px-4 flex items-center">
            <a href="https://honkbalsoftbal.nl/?cat=544" target="_blank" rel="noopener noreferrer" className="font-display font-800 text-xs text-white uppercase tracking-widest whitespace-nowrap hover:text-white/70 transition-colors">
              News →
            </a>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex animate-marquee items-center h-10" style={{ width: 'max-content' }}>
              {news.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display font-700 text-sm text-white hover:text-white/80 transition-colors whitespace-nowrap px-8"
                >
                  {item.title}
                  <span className="mx-6 opacity-40">·</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECENTE UITSLAGEN ── */}
      {results.length > 0 && (
        <section className="bg-[#04080f] pt-20 pb-14 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <SectionLabel>Recent Results</SectionLabel>
              <Link href="/uitslagen" className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-[0.2em] hover:underline hidden sm:block">
                All results →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {results.map(g => {
                const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0)
                const awayWon = (g.away_score ?? 0) > (g.home_score ?? 0)
                const winColor = TEAM_COLORS[homeWon ? g.home_team_id : g.away_team_id] ?? '#fe3d00'
                return (
                  <div key={g.id} className="relative bg-[#0a1220] border border-[#1a2a3a] overflow-hidden group hover:border-[var(--accent)]/50 transition-colors">
                    <div className="h-[3px]" style={{ backgroundColor: winColor }} />

                    <div className="p-4">
                      {/* Away */}
                      <div className={`flex items-center gap-2 mb-1.5 ${awayWon ? '' : 'opacity-35'}`}>
                        <TeamLogo teamId={g.away_team_id} size={32} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-display font-800 text-[0.72rem] uppercase text-white truncate leading-tight">
                            {TEAM_NAMES[g.away_team_id] ?? g.away_team_id}
                          </span>
                          {standingsMap[g.away_team_id] && (
                            <span className="font-display font-600 text-[0.6rem] text-[#4a6a8a] leading-none mt-0.5">
                              {standingsMap[g.away_team_id].wins}-{standingsMap[g.away_team_id].losses}
                            </span>
                          )}
                        </div>
                        <span className={`font-display font-800 text-2xl tabular-nums ${awayWon ? 'text-white' : 'text-white/30'}`}>
                          {g.away_score ?? '–'}
                        </span>
                      </div>

                      {/* Home */}
                      <div className={`flex items-center gap-2 ${homeWon ? '' : 'opacity-35'}`}>
                        <TeamLogo teamId={g.home_team_id} size={32} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-display font-800 text-[0.72rem] uppercase text-white truncate leading-tight">
                            {TEAM_NAMES[g.home_team_id] ?? g.home_team_id}
                          </span>
                          {standingsMap[g.home_team_id] && (
                            <span className="font-display font-600 text-[0.6rem] text-[#4a6a8a] leading-none mt-0.5">
                              {standingsMap[g.home_team_id].wins}-{standingsMap[g.home_team_id].losses}
                            </span>
                          )}
                        </div>
                        <span className={`font-display font-800 text-2xl tabular-nums ${homeWon ? 'text-white' : 'text-white/30'}`}>
                          {g.home_score ?? '–'}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 py-2 border-t border-[#1a2a3a] flex items-center justify-between">
                      <span className="font-display font-700 text-[11px] text-[#4a6a8a] uppercase tracking-widest">{formatDate(g.game_date)}</span>
                      <span className="font-display font-800 text-[11px] text-[var(--accent)] uppercase tracking-widest">Final</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── STAND + NEXT MATCH + LEADERS ── */}
      <section className="py-14 px-6 md:px-12 border-t border-[#0f1e2e]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-6 gap-8">

          {/* STAND — left, 3 cols */}
          <div className="lg:col-span-3">
            <div className="flex items-end justify-between mb-6">
              <SectionLabel>Standings</SectionLabel>
              <Link href="/stand" className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-[0.2em] hover:underline hidden sm:block">
                Volledig →
              </Link>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[1.5rem_1fr_4rem_3.5rem] md:grid-cols-[2rem_1fr_4rem_3.5rem_2.5rem] gap-2 px-4 pb-3 border-b border-[#0f1e2e]">
              {['#', 'Team', 'W-L', 'PCT'].map(h => (
                <span key={h} className="font-display font-700 text-[10px] text-[#4a6a8a] uppercase tracking-widest text-center first:text-left">{h}</span>
              ))}
              <span className="font-display font-700 text-[10px] text-[#4a6a8a] uppercase tracking-widest text-center hidden md:block">G</span>
            </div>

            <div className="divide-y divide-[#0a1620]">
              {standings.map((s, i) => {
                const pct = s.win_pct ? s.win_pct.toFixed(3).replace('0.', '.') : '.000'
                const isFirst = i === 0
                return (
                  <div key={s.team_id}
                    className={`grid grid-cols-[1.5rem_1fr_4rem_3.5rem] md:grid-cols-[2rem_1fr_4rem_3.5rem_2.5rem] gap-2 items-center px-4 py-3.5 transition-colors ${
                      isFirst ? 'bg-[var(--accent)]/10 border-l-[3px] border-[var(--accent)]' : 'hover:bg-[#0a1620]'
                    }`}>
                    <span className={`font-display font-800 text-sm ${isFirst ? 'text-[var(--accent)]' : 'text-[#4a6a8a]'}`}>{i + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo teamId={s.team_id} size={32} />
                      <div className="min-w-0">
                        <p className="font-display font-800 text-sm uppercase text-white leading-none truncate">
                          {TEAM_NAMES[s.team_id] ?? s.team_id}
                        </p>
                        {isFirst && (
                          <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-0.5">Leader</p>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-800 text-sm text-white text-center">{s.wins}-{s.losses}</span>
                    <span className={`font-display font-800 text-sm text-center ${isFirst ? 'text-[var(--accent)]' : 'text-white'}`}>{pct}</span>
                    <span className="font-display font-700 text-sm text-white text-center hidden md:block">{s.games_played}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* NEXT MATCH — 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <SectionLabel>Upcoming</SectionLabel>
            {upcoming.map((g) => (
              <div key={g.id}
                className="relative overflow-hidden border border-[var(--accent)]/40 bg-[#0f1e2e]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display font-700 text-xs text-[#4a6a8a] uppercase tracking-widest">
                      {formatDate(g.game_date)}{g.game_time ? ` · ${g.game_time.slice(0, 5)}` : ''}
                    </p>
                    {g.venue && (
                      <p className="font-display font-700 text-[10px] text-[#4a6a8a] uppercase tracking-widest truncate max-w-[45%] text-right">
                        {g.venue}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <TeamLogo teamId={g.away_team_id} size={36} />
                      <span className="font-display font-800 text-[11px] uppercase text-white text-center">{TEAM_SHORT[g.away_team_id]}</span>
                      {standingsMap[g.away_team_id] && (
                        <span className="font-display font-600 text-[10px] text-[#4a6a8a] text-center">
                          {standingsMap[g.away_team_id].wins}-{standingsMap[g.away_team_id].losses}
                        </span>
                      )}
                    </div>
                    <div className="text-center px-1">
                      <p className="font-display font-800 italic text-lg text-[#4a6a8a]">VS</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <TeamLogo teamId={g.home_team_id} size={36} />
                      <span className="font-display font-800 text-[11px] uppercase text-white text-center">{TEAM_SHORT[g.home_team_id]}</span>
                      {standingsMap[g.home_team_id] && (
                        <span className="font-display font-600 text-[10px] text-[#4a6a8a] text-center">
                          {standingsMap[g.home_team_id].wins}-{standingsMap[g.home_team_id].losses}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div className="border border-[#0f1e2e] p-6 text-center">
                <p className="font-display font-700 text-[#4a6a8a] uppercase text-sm">No games scheduled</p>
              </div>
            )}
          </div>

          {/* MINI LEADERS — 1 col */}
          <div className="lg:col-span-1">
            <SectionLabel>Leaders</SectionLabel>
            <div className="space-y-4">
              {/* Batting */}
              <div>
                <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Batting AVG</p>
                <div className="space-y-1">
                  {leaders.batters.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-display font-700 text-xs text-[#4a6a8a] w-4 shrink-0">{i + 1}</span>
                      <p className="font-display font-800 text-xs uppercase text-white truncate flex-1">
                        {p.name}
                      </p>
                      <span className="font-display font-800 text-xs text-[var(--accent)] shrink-0">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Pitching */}
              <div>
                <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">ERA</p>
                <div className="space-y-1">
                  {leaders.pitchers.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-display font-700 text-xs text-[#4a6a8a] w-4 shrink-0">{i + 1}</span>
                      <p className="font-display font-800 text-xs uppercase text-white truncate flex-1">
                        {p.name}
                      </p>
                      <span className="font-display font-800 text-xs text-[var(--accent)] shrink-0">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/leaders" className="block font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest hover:underline">
                All leaders →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── MEDIA GRID ── */}
      {media.length > 0 && (
        <section className="border-t border-[#0f1e2e] py-14 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <SectionLabel>Media</SectionLabel>
              <Link href="/media" className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-[0.2em] hover:underline hidden sm:block">
                Alle media →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {media.slice(0, 8).map((item, i) => {
                const isBig = i === 0
                const isVideo = item.type === 'video' || item.type === 'clip' || item.type === 'highlight'
                return (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className={`group relative overflow-hidden bg-[#0a1220] ${isBig ? 'md:col-span-2 md:row-span-2' : ''}`}
                    style={{ aspectRatio: isBig ? '16/10' : '1/1' }}>
                    {(item.thumbnail_url || item.url) && (
                      <Image src={item.thumbnail_url ?? item.url} alt={item.title ?? ''} fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-[var(--accent)]/90 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {item.title && (
                      <p className="absolute bottom-0 left-0 right-0 p-3 font-display font-800 text-xs uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.title}
                      </p>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── LEAGUE LEADER CALLOUT ── */}
      {leader && (
        <section className="bg-[var(--accent)] py-10 px-6 md:px-12">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              <TeamLogo teamId={leader.team_id} size={64} />
              <div>
                <p className="font-display font-700 text-white/70 uppercase tracking-[0.3em] text-xs mb-1">Current Leader</p>
                <p className="font-display font-800 italic text-4xl uppercase text-white leading-none">
                  <strong>{TEAM_NAMES[leader.team_id] ?? leader.team_id}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {[
                { label: 'Wins', value: leader.wins },
                { label: 'Losses', value: leader.losses },
                { label: 'PCT', value: leader.win_pct ? leader.win_pct.toFixed(3).replace('0.', '.') : '.000' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="font-display font-800 text-4xl text-white"><strong>{stat.value}</strong></p>
                  <p className="font-display font-700 text-white/60 text-xs uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
              <Link href="/stand"
                className="border-2 border-white px-6 py-3 font-display font-800 text-sm uppercase text-white hover:bg-white hover:text-[var(--accent)] transition-colors tracking-widest">
                Full Standings
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="h-1" />
    </div>
  )
}
