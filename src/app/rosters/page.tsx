import type { Metadata } from 'next'
import RosterTabs from './RosterTabs'
import { ROSTERS } from '@/lib/rosters-data'

export const metadata: Metadata = {
  title: 'Rosters 2026',
  description: 'Alle rosters van de Honkbal Hoofdklasse 2026. Spelers, posities en coaching staff per team.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/rosters' },
}

export const revalidate = false // static data — no revalidation needed

export default function RostersPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Rosters</strong>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-wider">
          All 7 teams · Players &amp; Coaching Staff
        </p>
      </div>
      <RosterTabs rosters={ROSTERS} />
    </div>
  )
}
