import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import InstagramFeed from '@/components/InstagramFeed'

export const revalidate = 300

const BEHOLD_FEED_ID = 'WvdPWsW4kSIGOMEZyJt6'

type MediaItem = {
  id: number
  type: string
  title: string | null
  url: string
  thumbnail_url: string | null
  published_at: string
}

async function getMedia() {
  const { data } = await supabase
    .from('media')
    .select('id, type, title, url, thumbnail_url, published_at')
    .order('published_at', { ascending: false })
    .limit(24)
  return (data ?? []) as MediaItem[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default async function SocialPage() {
  const media = await getMedia()

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">@honkbalhoofdklasse</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Social</strong>
          <span className="text-[var(--accent)]"> Media</span>
        </h1>
      </div>

      {/* Instagram profiel card */}
      <div className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] p-px rounded-2xl">
        <div className="bg-[var(--card)] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--border)] shrink-0">
              <Image
                src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
                alt="honkbalhoofdklasse"
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <p className="font-display font-800 text-xl text-white uppercase"><strong>@honkbalhoofdklasse</strong></p>
              <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-wider mt-0.5">KNBSB Hoofdklasse · Nieuws & Media</p>
            </div>
          </div>
          <a
            href="https://www.instagram.com/honkbalhoofdklasse/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display font-800 text-sm uppercase bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shrink-0"
          >
            Volgen op Instagram
          </a>
        </div>
      </div>

      {/* Instagram feed via Behold */}
      <section>
        <h2 className="font-display font-800 uppercase tracking-widest text-xs text-[var(--muted)] mb-4">
          Laatste Posts
        </h2>
        <InstagramFeed feedId={BEHOLD_FEED_ID} />
      </section>

      {/* Media uit Supabase */}
      {media.length > 0 && (
        <section>
          <h2 className="font-display font-800 uppercase tracking-widest text-xs text-[var(--muted)] mb-4">
            Media Gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {media.map(item => {
              const isVideo = item.type === 'video' || item.type === 'clip' || item.type === 'highlight'
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--card)]"
                >
                  {(item.thumbnail_url || item.url) && (
                    <Image
                      src={item.thumbnail_url ?? item.url}
                      alt={item.title ?? 'Post'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-display font-700">{formatDate(item.published_at)}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
