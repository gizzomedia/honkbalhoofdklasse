import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Livestream',
  description: 'Bekijk live honkbalwedstrijden van de Honkbal Hoofdklasse via de officiële livestream.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/livestream' },
}

export const revalidate = 60

const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}
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

function TeamLogo({ teamId }: { teamId: string }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1" style={{ backgroundColor: color }}>
      {logo
        ? <Image src={logo} alt={teamId} width={28} height={28} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-xs">{teamId.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

const PLATFORM_ICONS: Record<string, string> = {
  youtube: '▶',
  twitch: '◈',
  other: '◉',
}

type Stream = {
  id: number
  game_id: number | null
  title: string
  stream_url: string
  platform: string | null
  is_live: boolean
  scheduled_at: string | null
}

type Game = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
}

async function getData() {
  const today = new Date().toISOString().split('T')[0]

  const [streamsRes, upcomingRes] = await Promise.all([
    supabase.from('streams').select('*').order('scheduled_at', { ascending: true }),
    supabase.from('games').select('id,game_date,game_time,home_team_id,away_team_id')
      .eq('status', 'scheduled').gte('game_date', today).order('game_date', { ascending: true }).limit(20),
  ])

  return {
    streams: (streamsRes.data ?? []) as Stream[],
    upcoming: (upcomingRes.data ?? []) as Game[],
  }
}

function formatDateTime(dt: string) {
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default async function LivestreamPage() {
  const { streams, upcoming } = await getData()

  const liveNow = streams.filter(s => s.is_live)
  const scheduled = streams.filter(s => !s.is_live)

  const gamesWithoutStream = upcoming.filter(g => !streams.find(s => s.game_id === g.id))

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Livestream</strong>
          <span className="text-[var(--accent)]"> Hub</span>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-wider">
          Alle streams van de KNBSB Hoofdklasse op één plek
        </p>
      </div>

      {/* Live nu */}
      {liveNow.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse" />
            <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>Live Nu</strong></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveNow.map(stream => (
              <a key={stream.id} href={stream.stream_url} target="_blank" rel="noopener noreferrer"
                className="group bg-[var(--accent)] rounded-2xl p-5 hover:opacity-90 transition-opacity">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="font-display font-800 text-3xl text-white/60">
                    {PLATFORM_ICONS[stream.platform ?? 'other']}
                  </span>
                  <span className="font-display font-800 text-xs text-white bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">
                    Live
                  </span>
                </div>
                <p className="font-display font-800 text-xl uppercase text-white leading-tight">
                  <strong>{stream.title}</strong>
                </p>
                <p className="font-display font-700 text-white/70 text-sm mt-1 uppercase">
                  {(stream.platform ?? 'Stream').toUpperCase()} · Klik om te kijken →
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Geplande streams */}
      {scheduled.length > 0 && (
        <section>
          <h2 className="font-display font-800 italic text-2xl uppercase text-white mb-4">
            <strong>Geplande Streams</strong>
          </h2>
          <div className="space-y-3">
            {scheduled.map(stream => (
              <a key={stream.id} href={stream.stream_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4 hover:border-[var(--accent)] transition-colors group">
                <span className="font-display font-800 text-2xl text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                  {PLATFORM_ICONS[stream.platform ?? 'other']}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-800 text-lg uppercase text-white leading-none">
                    <strong>{stream.title}</strong>
                  </p>
                  {stream.scheduled_at && (
                    <p className="font-display font-700 text-[var(--muted)] text-sm mt-0.5 uppercase">
                      {formatDateTime(stream.scheduled_at)}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="font-display font-700 text-xs text-[var(--muted)] uppercase bg-[var(--card-hover)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
                    {(stream.platform ?? 'stream').toUpperCase()}
                  </span>
                </div>
                <span className="font-display font-800 text-[var(--accent)] text-lg shrink-0">→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Wedstrijden zonder stream */}
      {gamesWithoutStream.length > 0 && (
        <section>
          <h2 className="font-display font-800 italic text-2xl uppercase text-white mb-2">
            <strong>Aankomende Wedstrijden</strong>
          </h2>
          <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-wider mb-4">
            Nog geen stream bekend — volg ons voor updates
          </p>
          <div className="space-y-2">
            {gamesWithoutStream.slice(0, 8).map(g => (
              <div key={g.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden opacity-70">
                <div className="px-4 pt-3 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display font-800 text-sm uppercase text-white leading-none">
                      {formatDate(g.game_date)}
                      {g.game_time && <span className="text-[var(--muted)] ml-2">{g.game_time.slice(0, 5)}</span>}
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">Binnenkort</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <p className="font-display font-800 text-base md:text-xl uppercase text-white text-right leading-none truncate">
                        <strong>{TEAM_NAMES[g.away_team_id] ?? g.away_team_id}</strong>
                      </p>
                      <TeamLogo teamId={g.away_team_id} />
                    </div>
                    <div className="shrink-0 w-10 text-center">
                      <p className="font-display font-800 italic text-base text-[var(--muted)]">VS</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamLogo teamId={g.home_team_id} />
                      <p className="font-display font-800 text-base md:text-xl uppercase text-white leading-none truncate">
                        <strong>{TEAM_NAMES[g.home_team_id] ?? g.home_team_id}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {streams.length === 0 && liveNow.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display font-800 text-2xl uppercase text-[var(--muted)] italic">No streams available yet</p>
          <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest mt-2">
            Streams worden hier toegevoegd zodra ze bekend zijn
          </p>
        </div>
      )}
    </div>
  )
}
