import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 300

type Article = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  author: string | null
  published_at: string
  tags: string[] | null
}

async function getArticles() {
  const { data } = await supabase
    .from('news_articles')
    .select('id,title,slug,excerpt,cover_image_url,author,published_at,tags')
    .order('published_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Article[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function NieuwsPage() {
  const articles = await getArticles()
  const [featured, ...rest] = articles

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Seizoen 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Nieuws</strong>
        </h1>
      </div>

      {articles.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display font-800 text-2xl uppercase text-[var(--muted)] italic">Nog geen artikelen</p>
          <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest mt-2">
            Artikelen verschijnen hier zodra ze gepubliceerd worden
          </p>
        </div>
      )}

      {/* Featured artikel */}
      {featured && (
        <Link href={`/nieuws/${featured.slug}`}
          className="group block bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--accent)] transition-colors">
          {featured.cover_image_url && (
            <div className="aspect-[16/7] relative overflow-hidden">
              <Image src={featured.cover_image_url} alt={featured.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {featured.tags && featured.tags[0] && (
                  <span className="font-display font-800 text-xs text-white bg-[var(--accent)] px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block">
                    {featured.tags[0]}
                  </span>
                )}
                <h2 className="font-display font-800 italic text-3xl uppercase text-white leading-tight">
                  <strong>{featured.title}</strong>
                </h2>
                {featured.excerpt && (
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">{featured.excerpt}</p>
                )}
                <p className="font-display font-700 text-white/50 text-xs uppercase tracking-widest mt-2">
                  {featured.author && `${featured.author} · `}{formatDate(featured.published_at)}
                </p>
              </div>
            </div>
          )}
          {!featured.cover_image_url && (
            <div className="p-6">
              <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>{featured.title}</strong></h2>
              {featured.excerpt && <p className="text-[var(--muted)] mt-2">{featured.excerpt}</p>}
              <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mt-3">
                {featured.author && `${featured.author} · `}{formatDate(featured.published_at)}
              </p>
            </div>
          )}
        </Link>
      )}

      {/* Overige artikelen */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map(article => (
            <Link key={article.id} href={`/nieuws/${article.slug}`}
              className="group bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)] transition-colors">
              {article.cover_image_url && (
                <div className="aspect-video relative overflow-hidden">
                  <Image src={article.cover_image_url} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-4">
                {article.tags && article.tags[0] && (
                  <span className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-widest mb-1 block">
                    {article.tags[0]}
                  </span>
                )}
                <p className="font-display font-800 text-base uppercase text-white leading-tight">
                  <strong>{article.title}</strong>
                </p>
                {article.excerpt && (
                  <p className="text-[var(--muted)] text-sm mt-1 line-clamp-2">{article.excerpt}</p>
                )}
                <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mt-2">
                  {formatDate(article.published_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
