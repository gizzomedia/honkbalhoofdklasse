import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Uitslagen 2026',
  description: 'Alle uitslagen van de Honkbal Hoofdklasse 2026. Scores per wedstrijd met boxscores.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/uitslagen' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
