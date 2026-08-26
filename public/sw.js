// おにシミュ Service Worker — プレキャッシュ+キャッシュファースト
const VERSION = 'v1'
const CACHE_NAME = `onigiri-simu-${VERSION}`
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // 同一オリジンのみ処理(外部リソースは素通り)
  if (url.origin !== self.location.origin) return
  // POST等の非GETは素通り
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      // ナビゲーションはキャッシュになければ index.html にフォールバック(SPA)
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html')
      }
      return fetch(event.request)
        .then((res) => {
          // 正常レスポンスのみキャッシュに追加
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        .catch(() => cached)
    }),
  )
})
