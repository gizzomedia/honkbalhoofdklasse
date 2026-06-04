import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Notificaties instellen | Honkbal Hoofdklasse',
  description: 'Ontvang live pushmeldingen van de Honkbal Hoofdklasse. Zo zet je de app op je iPhone of Android en schakel je notificaties in.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/notificaties' },
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center font-display font-800 text-white text-sm">
        {n}
      </div>
      <div className="flex-1 pt-1.5">
        <h3 className="font-display font-800 uppercase text-white text-base mb-2"><strong>{title}</strong></h3>
        <div className="text-[var(--muted)] text-sm leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  )
}

export default function NotificatiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-14">

      {/* Header */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors mb-8">
          ← Terug
        </Link>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-2">Live updates</p>
        <h1 className="font-display font-800 italic text-5xl uppercase text-white mb-4">
          <strong>Notificaties</strong><br />
          <span className="text-[var(--accent)]">instellen</span>
        </h1>
        <p className="text-[var(--muted)] text-base leading-relaxed max-w-xl">
          Ontvang direct een melding bij homeruns, scores en game-updates van jouw favoriete team — gratis, via de Honkbal Hoofdklasse app.
        </p>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '⚾', label: 'Homeruns', desc: 'Elke homerun, direct op je scherm' },
          { icon: '🔴', label: 'Live scores', desc: 'Scores per inning van jouw team' },
          { icon: '🏆', label: 'Eindstand', desc: 'Finale uitslag zodra het spel klaar is' },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="text-3xl mb-3">{icon}</div>
            <p className="font-display font-800 uppercase text-white text-sm mb-1"><strong>{label}</strong></p>
            <p className="text-[var(--muted)] text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* iPhone instructions */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full shrink-0" />
          <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>iPhone — Safari</strong></h2>
        </div>
        <div className="space-y-8">
          <Step n={1} title="Open Safari">
            <p>Open de <strong className="text-white">Safari</strong> browser op je iPhone. Let op: andere browsers (Chrome, Firefox) ondersteunen geen pushmeldingen op iPhone.</p>
          </Step>
          <Step n={2} title="Ga naar honkbalhoofdklasse.com">
            <p>Typ <strong className="text-white">honkbalhoofdklasse.com</strong> in de adresbalk en open de website.</p>
          </Step>
          <Step n={3} title="Tik op de deelknop">
            <p>Tik onderin op het <strong className="text-white">deelpictogram</strong> — het vierkantje met een pijl omhoog. Als dat niet zichtbaar is, scroll je even omhoog op de pagina.</p>
          </Step>
          <Step n={4} title="Voeg toe aan beginscherm">
            <p>Scroll in het menu naar beneden en tik op <strong className="text-white">"Zet op beginscherm"</strong> (of "Add to Home Screen" bij Engelse taal).</p>
          </Step>
          <Step n={5} title="Tik op 'Voeg toe'">
            <p>Bevestig met <strong className="text-white">"Voeg toe"</strong> rechtsboven. De Honkbal Hoofdklasse app staat nu op je beginscherm.</p>
          </Step>
          <Step n={6} title="Open de app vanaf je beginscherm">
            <p>Belangrijk: open de app voortaan <strong className="text-white">via het icoontje op je beginscherm</strong>, niet via Safari. Alleen zo werken de pushmeldingen.</p>
          </Step>
          <Step n={7} title="Tik op het belletje">
            <p>Tik rechtsboven op het <strong className="text-white">belletje 🔔</strong>. Kies je favoriete teams en geef toestemming voor meldingen. Klaar!</p>
          </Step>
        </div>
      </div>

      {/* Android instructions */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full shrink-0" />
          <h2 className="font-display font-800 italic text-3xl uppercase text-white"><strong>Android — Chrome</strong></h2>
        </div>
        <div className="space-y-8">
          <Step n={1} title="Open Chrome">
            <p>Open <strong className="text-white">Google Chrome</strong> op je Android-telefoon en ga naar <strong className="text-white">honkbalhoofdklasse.com</strong>.</p>
          </Step>
          <Step n={2} title="Voeg toe aan startscherm">
            <p>Tik op de <strong className="text-white">drie puntjes</strong> rechtsbovenin en kies <strong className="text-white">"Toevoegen aan startscherm"</strong>. Bij sommige versies verschijnt dit vanzelf als een banner onderaan.</p>
          </Step>
          <Step n={3} title="Installeer de app">
            <p>Tik op <strong className="text-white">"Toevoegen"</strong> of <strong className="text-white">"Installeren"</strong>. De app staat nu op je startscherm.</p>
          </Step>
          <Step n={4} title="Tik op het belletje">
            <p>Open de app via het icoontje, tik op het <strong className="text-white">belletje 🔔</strong> rechtsboven, kies je teams en sta meldingen toe.</p>
          </Step>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl p-8 text-center">
        <p className="font-display font-800 italic text-2xl uppercase text-white mb-2"><strong>Klaar om te beginnen?</strong></p>
        <p className="text-[var(--muted)] text-sm mb-6">Volg de stappen hierboven en mis nooit meer een homerun.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[var(--accent)] text-white font-display font-800 uppercase tracking-wider text-xs px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Naar de app →
        </Link>
      </div>

    </div>
  )
}
