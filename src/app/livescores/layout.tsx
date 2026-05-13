import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Scores',
  description: 'Live scores van de Honkbal Hoofdklasse. Volg wedstrijden in real-time.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/livescores' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
