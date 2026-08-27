// おにシミュ Service Worker
// 戦略: HTMLはネットワークファースト(新デプロイを即反映)、
//       ハッシュ付きアセットはキャッシュファースト(不変)、
//       オフライン時はキャッシュへフォールバック
const VERSION = 'v3'
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

self.addEventListener('message', (event) => {
  // 新バージョン検知時に即時適用
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // 同一オリジンのみ処理(外部リソースは素通り)
  if (url.origin !== self.location.origin) return
  // POST等の非GETは素通り
  if (event.request.method !== 'GET') return

  const isAsset = url.pathname.includes('/assets/')
  // ナビゲーション(HTML)はネットワークファースト
  if (event.request.mode === 'navigate' || (!isAsset && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached ?? caches.match('./index.html')),
        ),
    )
    return
  }

  // その他(アセット・アイコン等)はキャッシュファースト
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((res) => {
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
