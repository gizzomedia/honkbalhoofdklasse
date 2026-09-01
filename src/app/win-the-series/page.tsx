import type { Metadata } from 'next'
import WinTheSeriesGame from './WinTheSeriesGame'

export const metadata: Metadata = {
  title: 'Win the Holland Series | Honkbal Hoofdklasse',
  description: 'Draft a 9-man lineup from real Honkbal Hoofdklasse regular-season stats, then play a full season — reach the playoffs and win the Holland Series.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/win-the-series' },
  openGraph: {
    title: 'Win the Holland Series',
    description: 'Draft a lineup from real regular-season stats and chase the Holland Series title.',
    url: 'https://honkbalhoofdklasse.com/win-the-series',
  },
}

export default function WinTheSeriesPage() {
  return <WinTheSeriesGame />
}
