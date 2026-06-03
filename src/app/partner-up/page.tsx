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
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', message: '', interests: [] as string[] })

  const interests = ['Logo op de website', 'Social media vermeldingen', 'Push notificaties', 'Maandelijkse stats posts', 'Livestream sponsoring', 'Prijsuitreikingen']

  function toggleInterest(v: string) {
    setForm(f => ({ ...f, interests: f.interests.includes(v) ? f.interests.filter(x => x !== v) : [...f.interests, v] }))
  }

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
        <label className="block font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Interesse in</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {interests.map(v => (
            <button key={v} type="button" onClick={() => toggleInterest(v)}
              className={`px-3 py-2 rounded-xl font-display font-700 text-xs uppercase tracking-wider text-left transition-all ${
                form.interests.includes(v)
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/30'
              }`}>
              {v}
            </button>
          ))}
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

// ── Partners ──────────────────────────────────────────────────────────────────
const PARTNERS = [
  { name: 'Bat King Europe', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp', type: 'Equipment Partner' },
  { name: 'SSK', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png', type: 'Award Sponsor' },
  { name: 'Louie Jay', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395308/LJ_hpdo4v.png', type: 'Media Partner' },
  { name: 'GizzoMedia', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395334/GizzoMedia_Logo_nedyfo.png', type: 'Tech Partner' },
  { name: 'Totaalwarmte', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png', type: 'Award Sponsor' },
  { name: 'Nouzoos', logo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394708/nouzoos_bnqatr.png', type: 'Media Partner' },
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
            Honkbal Hoofdklasse is het digitale thuisfront van het Nederlandse topbaseball. Verbind jouw merk met de meest betrokken baseballfans van Nederland.
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
            <StatCard value={10000} suffix="+" label="Instagram volgers" delay={0} />
            <StatCard value={500000} suffix="+" label="Jaarlijkse pageviews" delay={150} />
            <StatCard value={7} suffix="" label="Clubs · 1 platform" delay={300} />
            <StatCard value={14} suffix="+" label="Wedstrijden per maand" delay={450} />
          </div>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Waarom partneren?</p>
            <h2 className="font-display font-800 italic text-5xl uppercase text-white"><strong>Jouw merk. Ons podium.</strong></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📱', title: 'Multi-channel exposure', body: 'Van push notificaties tot social posts — jouw logo is zichtbaar op elk touchpoint waar fans hun team volgen.' },
              { icon: '⚾', title: 'Seizoen-lang zichtbaar', body: 'Geen losse campagnes maar structurele aanwezigheid. Wekelijks bereik jij onze community van toegewijde baseballfans.' },
              { icon: '🎯', title: 'Doelgroep op maat', body: 'Actieve sportconsumenten, 16–45 jaar, hogere betrokkenheid dan gemiddeld. Elke partner krijgt een pakket dat bij zijn merk past.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)]/40 transition-colors">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-display font-800 uppercase text-white text-lg mb-2"><strong>{title}</strong></h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">{body}</p>
              </div>
            ))}
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PARTNERS.map(p => (
              <div key={p.name} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center gap-4 hover:border-[var(--accent)]/40 transition-colors group">
                <div className="h-12 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo} alt={p.name} className="max-h-full max-w-[140px] object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] border border-[var(--border)] rounded-full px-3 py-1">{p.type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Pakketten</p>
            <h2 className="font-display font-800 italic text-5xl uppercase text-white"><strong>Kies je aanpak</strong></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter', price: 'Op aanvraag',
                perks: ['Logo op de website', 'Vermelding in seizoensoverzicht', '2 social posts per maand'],
                accent: false,
              },
              {
                name: 'Partner', price: 'Op aanvraag',
                perks: ['Alles van Starter', 'Award sponsoring (Player of Month)', 'Push notificatie vermeldingen', 'Logo op alle team-pagina\'s'],
                accent: true,
              },
              {
                name: 'Presenting', price: 'Op aanvraag',
                perks: ['Alles van Partner', 'Exclusief presenting sponsorship', 'Branded statistieken sectie', 'Maandelijkse reach rapportage'],
                accent: false,
              },
            ].map(pkg => (
              <div key={pkg.name} className={`rounded-2xl p-6 flex flex-col gap-5 border transition-all ${pkg.accent ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--accent)]/40'}`}>
                <div>
                  <p className={`font-display font-700 text-xs uppercase tracking-widest mb-1 ${pkg.accent ? 'text-white/60' : 'text-[var(--muted)]'}`}>{pkg.price}</p>
                  <h3 className="font-display font-800 italic text-3xl uppercase text-white"><strong>{pkg.name}</strong></h3>
                </div>
                <ul className="space-y-2 flex-1">
                  {pkg.perks.map(p => (
                    <li key={p} className={`flex items-start gap-2 text-sm font-display font-700 ${pkg.accent ? 'text-white' : 'text-white/80'}`}>
                      <span className={`shrink-0 mt-0.5 ${pkg.accent ? 'text-white' : 'text-[var(--accent)]'}`}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`text-center font-display font-800 uppercase tracking-wider text-sm py-3 rounded-xl transition-opacity hover:opacity-90 ${pkg.accent ? 'bg-white text-[var(--accent)]' : 'bg-[var(--accent)] text-white'}`}>
                  Aanvragen →
                </a>
              </div>
            ))}
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
