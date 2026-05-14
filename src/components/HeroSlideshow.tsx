'use client'

export default function HeroSlideshow() {
  return (
    <div
      className="relative flex items-end overflow-hidden"
      style={{ height: '100vh', marginTop: '-80px' }}
    >
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src="https://res.cloudinary.com/dqld625sq/video/upload/v1778618776/Website_hero_video_f8xbej.mp4"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#04080f] from-30% via-[#04080f]/70 via-55% to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04080f] via-transparent to-transparent" />

      {/* Text */}
      <div className="relative z-10 px-6 md:px-12 pb-20 max-w-6xl">
        <p className="font-display font-700 text-white/60 uppercase tracking-[0.3em] text-sm mb-2">Lucky Day</p>
        <h1
          className="font-display font-800 italic uppercase tracking-tight leading-none"
          style={{ fontSize: 'clamp(4rem, 14vw, 13rem)', lineHeight: 0.85 }}
        >
          <span className="text-white">HONKBAL</span>
          <br />
          <strong className="text-[var(--accent)]">HOOFDKLASSE</strong>
        </h1>
      </div>
    </div>
  )
}
