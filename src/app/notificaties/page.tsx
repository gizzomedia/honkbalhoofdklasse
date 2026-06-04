import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Set up notifications | Honkbal Hoofdklasse',
  description: 'Get live push notifications for the Honkbal Hoofdklasse. Add the app to your home screen on iPhone or Android and never miss a home run.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/notificaties' },
}

function NotifCard({ title, body, time, color }: { title: string; body: string; time: string; color: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5 w-[280px]"
      style={{
        background: 'rgba(10, 18, 32, 0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + '25', border: `1.5px solid ${color}50` }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-display font-700 text-[9px] uppercase tracking-widest text-white/35">Honkbal Hoofdklasse</p>
            <p className="font-display font-700 text-[9px] text-white/25 shrink-0">{time}</p>
          </div>
          <p className="font-display font-800 text-[13px] text-white leading-snug">{title}</p>
          <p className="font-display font-700 text-[11px] text-white/55 mt-0.5 leading-snug">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center font-display font-800 text-white text-sm mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="font-display font-800 uppercase text-white text-base mb-2"><strong>{title}</strong></h3>
        <div className="text-[var(--muted)] text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export default function NotificatiesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors mb-10">
        Back
      </Link>

      {/* Hero with scattered notifications */}
      <div className="relative mb-14">
        {/* Background notifications */}
        <div className="absolute -right-4 top-0 opacity-60 hidden sm:block" style={{ transform: 'rotate(3deg)' }}>
          <NotifCard title="Twins @ Pioniers — 6th inning" body="Nando Mostaert hits a 2-run home run! TWI 4 – PIO 1" time="now" color="#E05929" />
        </div>
        <div className="relative z-10 pt-2 pb-4 max-w-sm">
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-3">Push notifications</p>
          <h1 className="font-display font-800 italic text-5xl uppercase text-white leading-tight mb-4">
            <strong>Never miss</strong><br />
            <span className="text-[var(--accent)]">a pitch</span>
          </h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            Get instant alerts for home runs, scores, and game updates. Set up the app on your phone in two minutes.
          </p>
        </div>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
        {[
          { label: 'Home runs', desc: 'Every home run, instantly on your screen' },
          { label: 'Live scores', desc: 'Inning-by-inning updates from your team' },
          { label: 'Final score', desc: 'Game result as soon as it ends' },
        ].map(({ label, desc }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="font-display font-800 uppercase text-white text-sm mb-1.5"><strong>{label}</strong></p>
            <p className="text-[var(--muted)] text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* iPhone */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full shrink-0" />
          <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>iPhone — Safari</strong></h2>
        </div>

        {/* Inline notification */}
        <div className="mb-8 flex justify-center sm:justify-start">
          <NotifCard title="Lars Huijer is throwing a no-hitter!" body="PIR 0 hits allowed through 7 innings" time="live" color="#C8102E" />
        </div>

        <div className="space-y-7">
          <Step n={1} title="Open Safari">
            <p>Open the <strong className="text-white">Safari</strong> browser on your iPhone. Other browsers (Chrome, Firefox) do not support push notifications on iPhone.</p>
          </Step>
          <Step n={2} title="Go to honkbalhoofdklasse.com">
            <p>Type <strong className="text-white">honkbalhoofdklasse.com</strong> in the address bar and open the site.</p>
          </Step>
          <Step n={3} title="Tap the share button">
            <p>Tap the <strong className="text-white">share icon</strong> at the bottom of the screen, the square with an arrow pointing up. If it is not visible, scroll up slightly on the page.</p>
          </Step>
          <Step n={4} title="Add to Home Screen">
            <p>Scroll down in the share menu and tap <strong className="text-white">"Add to Home Screen"</strong>.</p>
          </Step>
          <Step n={5} title="Tap Add">
            <p>Confirm by tapping <strong className="text-white">"Add"</strong> in the top right. The Honkbal Hoofdklasse app is now on your home screen.</p>
          </Step>
          <Step n={6} title="Open the app from your home screen">
            <p>Important: always open the app <strong className="text-white">via the icon on your home screen</strong>, not via Safari. Push notifications only work this way.</p>
          </Step>
          <Step n={7} title="Tap the bell">
            <p>Tap the <strong className="text-white">bell icon</strong> in the top right corner. Choose your favorite teams and allow notifications. Done.</p>
          </Step>
        </div>
      </div>

      {/* Android */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full shrink-0" />
          <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>Android — Chrome</strong></h2>
        </div>

        {/* Inline notification */}
        <div className="mb-8 flex justify-center sm:justify-start">
          <NotifCard title="Final: Neptunus 7, UVV 2" body="WP: Kevin Kelly. Game over." time="2m ago" color="#003087" />
        </div>

        <div className="space-y-7">
          <Step n={1} title="Open Chrome">
            <p>Open <strong className="text-white">Google Chrome</strong> on your Android phone and go to <strong className="text-white">honkbalhoofdklasse.com</strong>.</p>
          </Step>
          <Step n={2} title="Add to home screen">
            <p>Tap the <strong className="text-white">three dots</strong> in the top right and choose <strong className="text-white">"Add to Home screen"</strong>. On some versions a banner appears at the bottom automatically.</p>
          </Step>
          <Step n={3} title="Install the app">
            <p>Tap <strong className="text-white">"Add"</strong> or <strong className="text-white">"Install"</strong>. The app is now on your home screen.</p>
          </Step>
          <Step n={4} title="Tap the bell">
            <p>Open the app from the icon, tap the <strong className="text-white">bell</strong> in the top right, choose your teams and allow notifications.</p>
          </Step>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <p className="font-display font-800 italic text-2xl uppercase text-white mb-2"><strong>Ready to start?</strong></p>
        <p className="text-[var(--muted)] text-sm mb-6">Follow the steps above and never miss a home run again.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[var(--accent)] text-white font-display font-800 uppercase tracking-wider text-xs px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to the app
        </Link>
      </div>

    </div>
  )
}
