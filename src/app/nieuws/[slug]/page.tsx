import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 300

async function getArticle(slug: string) {
  const { data } = await supabase
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <Link href="/nieuws" className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest hover:text-white transition-colors">
        ← Terug naar nieuws
      </Link>

      <div>
        {article.tags && article.tags[0] && (
          <span className="font-display font-800 text-xs text-white bg-[var(--accent)] px-2 py-1 rounded uppercase tracking-widest mb-3 inline-block">
            {article.tags[0]}
          </span>
        )}
        <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase tracking-tight text-white leading-tight mt-2">
          <strong>{article.title}</strong>
        </h1>
        <div className="flex items-center gap-3 mt-4">
          <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-wider">
            {article.author && <span>{article.author} · </span>}
            {formatDate(article.published_at)}
          </p>
        </div>
      </div>

      {article.cover_image_url && (
        <div className="aspect-video relative rounded-2xl overflow-hidden">
          <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
        </div>
      )}

      {article.excerpt && (
        <p className="font-display font-700 text-xl text-[var(--muted)] italic leading-relaxed border-l-4 border-[var(--accent)] pl-4">
          {article.excerpt}
        </p>
      )}

      <div
        className="prose prose-invert prose-lg max-w-none
          prose-p:text-[var(--muted)] prose-p:leading-relaxed
          prose-h2:font-display prose-h2:font-800 prose-h2:italic prose-h2:uppercase prose-h2:text-white
          prose-h3:font-display prose-h3:font-800 prose-h3:uppercase prose-h3:text-white
          prose-strong:text-white
          prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      <div className="border-t border-[var(--border)] pt-6">
        <Link href="/nieuws" className="font-display font-700 text-sm text-[var(--accent)] uppercase tracking-widest hover:underline">
          ← Terug naar nieuws
        </Link>
      </div>
    </div>
  )
}
