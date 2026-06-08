import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vera en Manon',
  description: 'Vera en Manon',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/vera-en-manon' },
}

export default function VeraEnManonPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
        Vera en Manon
      </h1>
    </div>
  )
}
