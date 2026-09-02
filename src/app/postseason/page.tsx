import type { Metadata } from 'next'
import { getHollandSeries } from '@/lib/holland-series'
import PostseasonBracket from './PostseasonBracket'

export const metadata: Metadata = {
  title: 'Postseason Bracket 2026 | Honkbal Hoofdklasse',
  description: 'The Honkbal Hoofdklasse 2026 postseason bracket — semifinals and the Holland Series with live series scores, schedule, boxscores and win probability.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/postseason' },
  openGraph: {
    title: 'Hoofdklasse Postseason Bracket 2026',
    description: 'Live bracket: semifinals and the Holland Series final.',
    url: 'https://honkbalhoofdklasse.com/postseason',
  },
}

export const revalidate = 30

export default async function PostseasonPage() {
  const data = await getHollandSeries()
  return <PostseasonBracket initial={data} />
}
