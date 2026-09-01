import type { Metadata } from 'next'
import { getHollandSeries } from '@/lib/holland-series'
import HollandSeriesHub from './HollandSeriesHub'

export const metadata: Metadata = {
  title: 'Holland Series 2026 | Honkbal Hoofdklasse',
  description: 'Holland Series 2026 — live series score, schedule, results, boxscores and win probability from the KNBSB Honkbal Hoofdklasse final.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/holland-series' },
  openGraph: {
    title: 'Holland Series 2026',
    description: 'Live series score, schedule and results from the Honkbal Hoofdklasse final.',
    url: 'https://honkbalhoofdklasse.com/holland-series',
  },
}

export const revalidate = 30

export default async function HollandSeriesPage() {
  const data = await getHollandSeries()
  return <HollandSeriesHub initial={data} />
}
