import type { Metadata } from 'next'
import { getHollandSeries } from '@/lib/holland-series'
import HollandSeriesHub from './HollandSeriesHub'

export const metadata: Metadata = {
  title: 'Holland Series 2026 | Honkbal Hoofdklasse',
  description: 'De Holland Series 2026 — live serie-stand, schema, uitslagen, boxscores en win-probability van de finale van de KNBSB Honkbal Hoofdklasse.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/holland-series' },
  openGraph: {
    title: 'Holland Series 2026',
    description: 'Live serie-stand, schema en uitslagen van de Honkbal Hoofdklasse finale.',
    url: 'https://honkbalhoofdklasse.com/holland-series',
  },
}

export const revalidate = 30

export default async function HollandSeriesPage() {
  const data = await getHollandSeries()
  return <HollandSeriesHub initial={data} />
}
