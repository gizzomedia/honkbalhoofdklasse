const CACHE = 'hk-shell-v1'

const PRECACHE_URLS = [
  '/',
  '/livescores',
  '/stand',
  '/schema',
  '/uitslagen',
  '/leaders',
  '/teams',
  '/offline',
]

// Install: precache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't fail install if a page 404s
  )
})

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes: always network, never cache
  if (url.pathname.startsWith('/api/')) return

  // Next.js internals: let them through
  if (url.pathname.startsWith('/_next/')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok && url.pathname.includes('/_next/static/')) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      }))
    )
    return
  }

  // Pages: network-first, fall back to cache, then /offline
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match('/offline'))
      )
  )
})

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon  || '/icons/icon-192.png',
      badge: data.badge || '/icons/badge-72.png',
      data:  data.data  || {},
      tag:   data.tag   || 'hk-notif',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url === self.location.origin + url)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
