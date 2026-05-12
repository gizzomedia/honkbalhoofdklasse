'use client'

import Script from 'next/script'

export default function InstagramFeed({ feedId }: { feedId: string }) {
  return (
    <>
      {/* @ts-expect-error custom element */}
      <behold-widget feed-id={feedId} />
      <Script
        id="behold-widget-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(()=>{const d=document,s=d.createElement("script");s.type="module";s.src="https://w.behold.so/widget.js";d.head.append(s);})();`
        }}
      />
    </>
  )
}
