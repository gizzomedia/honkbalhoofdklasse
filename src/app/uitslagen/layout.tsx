import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '',
  description: '',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/uitslagen' },
  openGraph: {
    title: '',
    description: '',
    url: 'https://honkbalhoofdklasse.com/uitslagen',
    images: ['https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
