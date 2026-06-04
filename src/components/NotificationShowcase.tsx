'use client'

const NOTIFICATIONS = [
  {
    title: 'Twins @ Pioniers — 5th inning',
    body: 'Lars Huijer hits a home run! TWI 4 – PIO 1',
    time: '2m ago',
    icon: '⚾',
    color: '#E05929',
  },
  {
    title: 'Neptunus @ Pirates — Final',
    body: 'Neptunus beat Pirates, 6–2. WP: Kevin Kelly',
    time: '14m ago',
    icon: '🏆',
    color: '#003087',
  },
  {
    title: 'Kinheim @ HCAW — Game is live!',
    body: 'Game has started ⚾',
    time: '32m ago',
    icon: '🔴',
    color: '#004225',
  },
]

function NotifCard({ title, body, time, icon, color, style }: typeof NOTIFICATIONS[0] & { style?: React.CSSProperties }) {
  return (
    <div
      className="relative w-[300px] rounded-2xl px-4 py-3.5 select-none"
      style={{
        background: 'rgba(15, 25, 40, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ backgroundColor: color + '30', border: `1px solid ${color}40` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-display font-700 text-[10px] uppercase tracking-widest text-white/40">Honkbal Hoofdklasse</p>
            <p className="font-display font-700 text-[10px] text-white/30 shrink-0">{time}</p>
          </div>
          <p className="font-display font-800 text-sm text-white leading-tight">{title}</p>
          <p className="font-display font-700 text-xs text-white/60 mt-0.5 leading-snug">{body}</p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationShowcase() {
  return (
    <div className="relative h-44 w-[340px] mx-auto">
      {NOTIFICATIONS.map((n, i) => (
        <div
          key={i}
          className="absolute transition-all duration-500"
          style={{
            top: `${i * 14}px`,
            left: `${i * 10}px`,
            zIndex: NOTIFICATIONS.length - i,
            opacity: 1 - i * 0.15,
            transform: `scale(${1 - i * 0.04})`,
            transformOrigin: 'top left',
          }}
        >
          <NotifCard {...n} />
        </div>
      ))}
    </div>
  )
}
