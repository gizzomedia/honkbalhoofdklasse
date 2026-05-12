import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export const revalidate = 300

type MediaItem = {
  id: number
  type: string
  title: string | null
  url: string
  thumbnail_url: string | null
  published_at: string
  tags: string[] | null
}

async function getMedia() {
  const { data } = await supabase
    .from('media')
    .select('id, type, title, url, thumbnail_url, published_at, tags')
    .order('published_at', { ascending: false })
    .limit(50)
  return data ?? []
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default async function MediaPage() {
  const items = await getMedia()

  const posters = items.filter(i => i.type === 'poster')
  const videos = items.filter(i => i.type === 'video' || i.type === 'clip' || i.type === 'highlight')

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Content</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Media</strong>
          <span className="text-[var(--accent)]"> Gallery</span>
        </h1>
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="font-display font-700 text-xl uppercase">Nog geen media beschikbaar</p>
          <p className="text-sm mt-2">Posters en clips verschijnen hier zodra ze gepubliceerd worden.</p>
        </div>
      )}

      {posters.length > 0 && (
        <section>
          <h2 className="font-display font-800 uppercase tracking-widest text-xs text-[var(--muted)] mb-4">Posters</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {posters.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--card)]"
              >
                {item.thumbnail_url || item.url ? (
                  <Image
                    src={item.thumbnail_url ?? item.url}
                    alt={item.title ?? 'Poster'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display font-700 text-[var(--muted)] text-xs uppercase">Poster</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.title && (
                    <p className="font-display font-700 text-white text-sm uppercase leading-tight">{item.title}</p>
                  )}
                  <p className="text-white/60 text-xs">{formatDate(item.published_at)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="font-display font-800 uppercase tracking-widest text-xs text-[var(--muted)] mb-4">Video & Clips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)] transition-colors"
              >
                <div className="aspect-video relative bg-black/40">
                  {item.thumbnail_url && (
                    <Image
                      src={item.thumbnail_url}
                      alt={item.title ?? 'Video'}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center opacity-90">
                      <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="font-display font-800 text-sm uppercase text-white">
                    {item.title ?? 'Highlight clip'}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{formatDate(item.published_at)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
