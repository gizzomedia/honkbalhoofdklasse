import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '',
  description: '',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/pick-em' },
  openGraph: {
    title: '',
    description: '',
    url: 'https://honkbalhoofdklasse.com/pick-em',
    images: ['https://res.cloudinary.com/dn8c5398m/image/upload/q_auto/f_auto/v1781607525/hk_logo_iets_groter_tumykq.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
