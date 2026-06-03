'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, active = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start: number
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, active])
  return val
}

function StatCard({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, 1800, active)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setActive(true), delay); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div ref={ref} className="text-center">
      <p className="font-display font-800 italic text-5xl md:text-6xl text-white tracking-tight">
        <strong>{count.toLocaleString('nl-NL')}{suffix}</strong>
      </p>
      <p className="font-display font-700 text-xs uppercase tracking-widest text-white/50 mt-2">{label}</p>
    </div>
  )
}

// ── Rotating words ────────────────────────────────────────────────────────────
const ROTATING_WORDS = ['Neptunus', 'Pirates', 'Kinheim', 'HCAW', 'Twins', 'Pioniers', 'UVV']

function RotatingWord() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % ROTATING_WORDS.length); setVisible(true) }, 300)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      className="inline-block text-[var(--accent)] transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-12px)' }}
    >
      {ROTATING_WORDS[idx]}
    </span>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────
function PartnerForm() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', message: '' })


  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    setSent(true)
  }

  if (sent) return (
    <div className="text-center py-16 px-8">
      <div className="text-5xl mb-4">⚾</div>
      <h3 className="font-display font-800 italic text-3xl uppercase text-white mb-3"><strong>Bedankt!</strong></h3>
      <p className="text-[var(--muted)] font-display font-700 text-sm uppercase tracking-wider">We nemen binnen 2 werkdagen contact met je op.</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Bedrijfsnaam *</label>
          <input required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Jouw bedrijf BV" />
        </div>
        <div>
          <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Contactpersoon *</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Naam" />
        </div>
        <div>
          <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-2">E-mailadres *</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="info@bedrijf.nl" />
        </div>
        <div>
          <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Telefoonnummer</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="+31 6 00 00 00 00" />
        </div>
      </div>

      <div>
        <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Bericht</label>
        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
          placeholder="Vertel ons over je merk en doelen..." />
      </div>

      <button type="submit" disabled={sending}
        className="w-full bg-[var(--accent)] text-white font-display font-800 uppercase tracking-wider text-sm py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
        {sending ? 'Versturen…' : 'Verstuur aanvraag →'}
      </button>
    </form>
  )
}

// ── Instagram Posts carousel ─────────────────────────────────────────────────
const IG_POSTS = [
  {
    image: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780499545/SSK_-_Post_v60xuh.jpg',
    partnerLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png',
    partner: 'SSK',
    reach: 30700,
    likes: 706,
    shares: 29,
    isVideo: false,
  },
  {
    image: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780499545/Batking_-_Post_bmo7kv.jpg',
    partnerLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp',
    partner: 'Bat King Europe',
    reach: 24100,
    likes: 635,
    shares: 19,
    isVideo: false,
  },
  {
    image: 'https://res.cloudinary.com/dn8c5398m/video/upload/Nouzoos_-_Post_ydzuto.jpg',
    partnerLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394708/nouzoos_bnqatr.png',
    partner: 'Nouzoos',
    reach: 17800,
    likes: 446,
    shares: 20,
    isVideo: true,
  },
  {
    image: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780499545/Totaalwarmte_-_Post_grqazo.jpg',
    partnerLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png',
    partner: 'Totaalwarmte',
    reach: 13900,
    likes: 353,
    shares: 14,
    isVideo: false,
  },
]

function InstagramCarousel() {
  const [idx, setIdx] = useState(0)
  const post = IG_POSTS[idx]

  return (
    <div className="max-w-sm mx-auto">
      {/* Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--accent)]/20 flex items-center justify-center shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://res.cloudinary.com/dn8c5398m/image/upload/q_auto/f_auto/v1780500111/573820232_17862847515514579_6349657726355167801_n_vs87hx.jpg" alt="HK" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-800 text-xs text-white uppercase tracking-wider">honkbalhoofdklasse</p>
            <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">Gesponsord door {post.partner}</p>
          </div>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/30 shrink-0" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>

        {/* Post image */}
        <div className="relative bg-black border-b border-[var(--border)]" style={{ aspectRatio: '3/4' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.partner} className="w-full h-full object-cover" />
          {/* Partner logo badge bottom-right */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.partnerLogo} alt={post.partner} className="h-5 max-w-[80px] object-contain" />
          </div>
          {/* Video indicator */}
          {post.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white ml-1" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Big stats row */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
          {[
            { label: 'Bereik', val: post.reach, accent: true },
            { label: 'Likes', val: post.likes, accent: false },
            { label: 'Doorgestuurd', val: post.shares, accent: false },
          ].map(({ label, val, accent }) => (
            <div key={label} className="flex flex-col items-center justify-center py-5 px-2 gap-1">
              <p className={`font-display font-800 italic text-2xl leading-none ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>
                <strong>{val.toLocaleString('nl-NL')}</strong>
              </p>
              <p className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center">{label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIdx(i => (i - 1 + IG_POSTS.length) % IG_POSTS.length)}
          className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-white/60 hover:text-white hover:border-[var(--accent)]/50 transition-all"
        >←</button>
        <div className="flex gap-1.5">
          {IG_POSTS.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(i => (i + 1) % IG_POSTS.length)}
          className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-white/60 hover:text-white hover:border-[var(--accent)]/50 transition-all"
        >
          →
        </button>
      </div>
    </div>
  )
}


// ── Partners ──────────────────────────────────────────────────────────────────
const PARTNERS = [
  { name: 'Bat King Europe', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp' },
  { name: 'SSK', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png' },
  { name: 'Totaalwarmte', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png' },
  { name: 'Nouzoos', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394708/nouzoos_bnqatr.png' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PartnerUpPage() {
  return (
    <div className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--accent)]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--accent)]/15 border border-[var(--accent)]/30 rounded-full px-5 py-2 mb-8">
            <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
            <span className="font-display font-700 text-xs uppercase tracking-widest text-[var(--accent)]">Seizoen 2026 · Hoofdklasse</span>
          </div>

          <h1 className="font-display font-800 italic text-6xl md:text-8xl uppercase tracking-tight text-white leading-none mb-6">
            <strong>Bereik elke fan van</strong>
            <br />
            <RotatingWord />
          </h1>

          <p className="text-[var(--muted)] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Bereik een betrokken doelgroep van spelers, fans, coaches en clubs. Samen bouwen we aan de groei en zichtbaarheid van het Nederlandse honkbal.
          </p>

          <a href="#contact"
            className="inline-flex items-center gap-3 bg-[var(--accent)] text-white font-display font-800 uppercase tracking-wider text-sm px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/25">
            Word partner →
          </a>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-4 border-y border-white/5" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,107,0,0.05), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] text-center mb-12">Ons bereik in cijfers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            <StatCard value={4800} suffix="+" label="Volgers op socials" delay={0} />
            <StatCard value={2250000} suffix="+" label="Weergaven afgelopen 90 dagen" delay={150} />
            <StatCard value={68000} suffix="+" label="Interacties afgelopen 90 dagen" delay={300} />
            <StatCard value={7} suffix="" label="Clubs · 1 platform" delay={450} />
          </div>
        </div>
      </section>



      {/* ── DOELGROEP ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Onze community</p>
            <h2 className="font-display font-800 italic text-5xl uppercase text-white"><strong>Doelgroep</strong></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Leeftijd */}
            <div className="md:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-6">Leeftijdsverdeling</p>
              <div className="space-y-5">
                {[
                  { label: '25–34 jaar', pct: 34.3, highlight: true },
                  { label: '18–24 jaar', pct: 25.2, highlight: false },
                  { label: '35–44 jaar', pct: 14.9, highlight: false },
                  { label: '45–54 jaar', pct: 12.5, highlight: false },
                ].map(({ label, pct, highlight }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-display font-800 text-sm uppercase tracking-wider ${highlight ? 'text-white' : 'text-white/70'}`}>{label}</span>
                      <span className={`font-display font-800 text-sm ${highlight ? 'text-[var(--accent)]' : 'text-white/50'}`}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${pct / 34.3 * 100}%`,
                          background: highlight
                            ? 'var(--accent)'
                            : 'rgba(255,255,255,0.25)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geslacht + Bereik niet-volgers */}
            <div className="flex flex-col gap-6">

              {/* Geslacht */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex-1">
                <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-5">Geslacht</p>
                <div className="space-y-4">
                  {[
                    { label: 'Man', pct: 73.6 },
                    { label: 'Vrouw', pct: 26.4 },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="font-display font-800 text-sm uppercase tracking-wider text-white">{label}</span>
                        <span className="font-display font-800 text-sm text-[var(--accent)]">{pct}%</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Niet-volgers */}
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl p-6 text-center">
                <p className="font-display font-800 italic text-5xl text-[var(--accent)] leading-none mb-2"><strong>52%</strong></p>
                <p className="font-display font-700 text-xs uppercase tracking-widest text-white/60 leading-snug">
                  van de weergaven<br />van niet-volgers
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-3">Waarom Honkbal Hoofdklasse?</p>
              <h2 className="font-display font-800 italic text-5xl uppercase text-white mb-8"><strong>Dedicated platform voor Nederlands topbaseball</strong></h2>
              <ul className="space-y-4">
                {[
                  'Dedicated platform voor Nederlands topbaseball',
                  'Dagelijkse content',
                  'Groeiend social bereik',
                  'Focus op de complete competitie',
                  'Directe toegang tot een niche maar zeer betrokken doelgroep',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    </span>
                    <span className="font-display font-700 text-white/80 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 space-y-6">
              {[
                { n: '2.25M+', l: 'Weergaven · 90 dagen' },
                { n: '68K+',   l: 'Interacties · 90 dagen' },
                { n: '52%',    l: 'Bereik buiten eigen volgers' },
                { n: '7',      l: 'Clubs · 1 platform' },
              ].map(({ n, l }) => (
                <div key={l} className="flex items-center gap-4 border-b border-[var(--border)] last:border-0 pb-5 last:pb-0">
                  <p className="font-display font-800 italic text-3xl text-[var(--accent)] shrink-0 w-24 leading-none"><strong>{n}</strong></p>
                  <p className="font-display font-700 text-sm uppercase tracking-wider text-white/60">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section className="py-20 px-4 bg-[var(--card)]/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Huidige partners</p>
            <h2 className="font-display font-800 italic text-4xl uppercase text-white"><strong>Ze gingen je voor</strong></h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PARTNERS.map(p => (
              <div key={p.name} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 flex items-center justify-center hover:border-[var(--accent)]/40 transition-colors group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt={p.name} className="max-h-10 max-w-[140px] object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTAGRAM POSTS ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-3">Bewezen bereik</p>
              <h2 className="font-display font-800 italic text-4xl uppercase text-white mb-4"><strong>Zo presteren onze posts</strong></h2>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                Elk stuk content dat wij plaatsen trekt duizenden fans. Jouw merk staat op het middelpunt van die aandacht.
              </p>
            </div>
            <InstagramCarousel />
          </div>
        </div>
      </section>

      {/* ── CASES ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Mogelijkheden</p>
            <h2 className="font-display font-800 italic text-5xl uppercase text-white"><strong>Waar kun je aan denken?</strong></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4 hover:border-[var(--accent)]/40 transition-colors">
              <span className="font-display font-800 italic text-5xl text-[var(--accent)]/30 leading-none"><strong>01</strong></span>
              <div>
                <h3 className="font-display font-800 uppercase text-white text-lg mb-2"><strong>Logo bij Hoofdklasse Pickle</strong></h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">Terugkerende bezoekers met 1.000+ unieke bezoekers in de eerste 2 weken. Hoge zichtbaarheid bij een vaste, betrokken groep fans.</p>
              </div>
              <a href="#contact" className="mt-auto font-display font-800 text-xs uppercase tracking-wider text-[var(--accent)] hover:underline">Meer weten →</a>
            </div>

            <div className="bg-[var(--accent)] border border-[var(--accent)] rounded-2xl p-6 flex flex-col gap-4">
              <span className="font-display font-800 italic text-5xl text-white/20 leading-none"><strong>02</strong></span>
              <div>
                <h3 className="font-display font-800 uppercase text-white text-lg mb-2"><strong>Rankings, awards en content-series</strong></h3>
                <p className="text-white/70 text-sm leading-relaxed">Jouw naam koppelen aan wekelijkse awards, statistiekoverzichten of vaste content-rubrieken. Structurele zichtbaarheid gedurende het hele seizoen.</p>
              </div>
              <a href="#contact" className="mt-auto font-display font-800 text-xs uppercase tracking-wider text-white hover:underline">Meer weten →</a>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4 hover:border-[var(--accent)]/40 transition-colors">
              <span className="font-display font-800 italic text-5xl text-[var(--accent)]/30 leading-none"><strong>03</strong></span>
              <div>
                <h3 className="font-display font-800 uppercase text-white text-lg mb-2"><strong>Custom campagne</strong></h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">Maatwerk is altijd mogelijk. Denk aan branded posts, exclusieve vermeldingen of een campagne die volledig aansluit op jouw merk en doelen.</p>
              </div>
              <a href="#contact" className="mt-auto font-display font-800 text-xs uppercase tracking-wider text-[var(--accent)] hover:underline">Meer weten →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contact" className="py-20 px-4 border-t border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Klaar om te starten?</p>
            <h2 className="font-display font-800 italic text-5xl uppercase text-white mb-4"><strong>Neem contact op</strong></h2>
            <p className="text-[var(--muted)] text-sm leading-relaxed">Vul het formulier in en we nemen binnen 2 werkdagen contact op voor een kennismaking.</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
            <PartnerForm />
          </div>
        </div>
      </section>

    </div>
  )
}
