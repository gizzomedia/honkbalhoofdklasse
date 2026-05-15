import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Scores | Honkbal Hoofdklasse',
  description: 'Live scores, boxscores en standen van de Honkbal Hoofdklasse. Volg wedstrijden in real-time.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/livescores' },
  openGraph: {
    title: 'Live Scores | Honkbal Hoofdklasse',
    description: 'Live scores, boxscores en standen van de Honkbal Hoofdklasse.',
    url: 'https://honkbalhoofdklasse.com/livescores',
    siteName: 'Honkbal Hoofdklasse',
    images: [{ url: 'https://honkbalhoofdklasse.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: 'Live Scores | Honkbal Hoofdklasse' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
