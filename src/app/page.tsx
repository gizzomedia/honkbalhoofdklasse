import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import HeroSlideshow from '@/components/HeroSlideshow'

export const revalidate = 120

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
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'NEP', pirates: 'PIR', kinheim: 'KIN',
  hcaw: 'HCA', twins: 'TWI', pioniers: 'PIO', uvv: 'UVV',
}

async function getData() {
  const today = new Date().toISOString().split('T')[0]
  const [standRes, resultsRes, upcomingRes, mediaRes] = await Promise.all([
    supabase.from('standings').select('*').eq('season', 2026).order('wins', { ascending: false }).order('win_pct', { ascending: false }),
    supabase.from('games').select('*').eq('status', 'final').order('game_date', { ascending: false }).limit(6),
    supabase.from('games').select('*').eq('status', 'scheduled').gte('game_date', today).order('game_date', { ascending: true }).limit(4),
    supabase.from('media').select('id,type,title,url,thumbnail_url,published_at').order('published_at', { ascending: false }).limit(8),
  ])
  return {
    standings: standRes.data ?? [],
    results: resultsRes.data ?? [],
    upcoming: upcomingRes.data ?? [],
    media: mediaRes.data ?? [],
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
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
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
  const { standings, results, upcoming, media } = await getData()
  const nextGame = upcoming[0]
  const leader = standings[0]

  return (
    <div>

      {/* ── HERO ── */}
      <HeroSlideshow />

      {/* ── RECENTE UITSLAGEN ── */}
      {results.length > 0 && (
        <section className="bg-[#04080f] pt-20 pb-14 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <SectionLabel>Recente Uitslagen</SectionLabel>
              <Link href="/uitslagen" className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-[0.2em] hover:underline hidden sm:block">
                Alle uitslagen →
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
                        <span className="font-display font-800 text-[0.72rem] uppercase text-white flex-1 truncate leading-tight">
                          {TEAM_NAMES[g.away_team_id] ?? g.away_team_id}
                        </span>
                        <span className={`font-display font-800 text-2xl tabular-nums ${awayWon ? 'text-white' : 'text-white/30'}`}>
                          {g.away_score ?? '–'}
                        </span>
                      </div>

                      {/* Home */}
                      <div className={`flex items-center gap-2 ${homeWon ? '' : 'opacity-35'}`}>
                        <TeamLogo teamId={g.home_team_id} size={32} />
                        <span className="font-display font-800 text-[0.72rem] uppercase text-white flex-1 truncate leading-tight">
                          {TEAM_NAMES[g.home_team_id] ?? g.home_team_id}
                        </span>
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

      {/* ── STAND + NEXT MATCH ── */}
      <section className="py-14 px-6 md:px-12 border-t border-[#0f1e2e]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* STAND — left, 3 cols */}
          <div className="lg:col-span-3">
            <div className="flex items-end justify-between mb-6">
              <SectionLabel>Hoofdklasse Stand</SectionLabel>
              <Link href="/stand" className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-[0.2em] hover:underline hidden sm:block">
                Volledig →
              </Link>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_3.5rem] gap-2 px-4 pb-3 border-b border-[#0f1e2e]">
              {['#', 'Team', 'G', 'W', 'L', 'PCT'].map(h => (
                <span key={h} className="font-display font-700 text-[10px] text-[#4a6a8a] uppercase tracking-widest text-center first:text-left">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-[#0a1620]">
              {standings.map((s, i) => {
                const pct = s.win_pct ? s.win_pct.toFixed(3).replace('0.', '.') : '.000'
                const isFirst = i === 0
                return (
                  <div key={s.team_id}
                    className={`grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_3.5rem] gap-2 items-center px-4 py-3.5 transition-colors ${
                      isFirst ? 'bg-[var(--accent)]/10 border-l-[3px] border-[var(--accent)]' : 'hover:bg-[#0a1620]'
                    }`}>
                    <span className={`font-display font-800 text-base ${isFirst ? 'text-[var(--accent)]' : 'text-[#4a6a8a]'}`}>{i + 1}</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamLogo teamId={s.team_id} size={38} />
                      <div>
                        <p className="font-display font-800 text-base uppercase text-white leading-none truncate">
                          {TEAM_NAMES[s.team_id] ?? s.team_id}
                        </p>
                        {isFirst && (
                          <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-0.5">Leider</p>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-700 text-base text-white text-center">{s.games_played}</span>
                    <span className="font-display font-800 text-base text-white text-center">{s.wins}</span>
                    <span className="font-display font-600 text-base text-[#4a6a8a] text-center">{s.losses}</span>
                    <span className={`font-display font-800 text-base text-center ${isFirst ? 'text-[var(--accent)]' : 'text-white'}`}>{pct}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* NEXT MATCH — right, 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <SectionLabel>Aankomend</SectionLabel>

            {upcoming.map((g, i) => {
              const isNext = i === 0
              return (
                <div key={g.id}
                  className={`relative overflow-hidden border ${isNext ? 'border-[var(--accent)]/40 bg-[#0f1e2e]' : 'border-[#0f1e2e] bg-[#080f18]'}`}>
                  {isNext && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
                  <div className="p-5">
                    {isNext && (
                      <span className="inline-block font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] bg-[var(--accent)]/10 px-2 py-1 mb-4">
                        Volgende Wedstrijd
                      </span>
                    )}
                    <p className="font-display font-700 text-xs text-[#4a6a8a] uppercase tracking-widest mb-4">
                      {formatDate(g.game_date)}{g.game_time ? ` · ${g.game_time.slice(0, 5)}` : ''}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <TeamLogo teamId={g.away_team_id} size={isNext ? 52 : 36} />
                        <span className="font-display font-800 text-xs uppercase text-white text-center">{TEAM_SHORT[g.away_team_id]}</span>
                      </div>
                      <div className="text-center px-2">
                        <p className="font-display font-800 italic text-2xl text-[#4a6a8a]">VS</p>
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <TeamLogo teamId={g.home_team_id} size={isNext ? 52 : 36} />
                        <span className="font-display font-800 text-xs uppercase text-white text-center">{TEAM_SHORT[g.home_team_id]}</span>
                      </div>
                    </div>
                    {isNext && (
                      <Link href="/schema"
                        className="mt-5 block w-full bg-[var(--accent)] py-3 text-center font-display font-800 text-sm uppercase text-white tracking-widest hover:bg-[#e53500] transition-colors">
                        Voorspel de uitslag →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}

            {upcoming.length === 0 && (
              <div className="border border-[#0f1e2e] p-8 text-center">
                <p className="font-display font-700 text-[#4a6a8a] uppercase text-sm">Geen wedstrijden gepland</p>
              </div>
            )}
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
                <p className="font-display font-700 text-white/70 uppercase tracking-[0.3em] text-xs mb-1">Huidig leider</p>
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
                Volledige Stand
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="h-1" />
    </div>
  )
}
