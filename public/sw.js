const CACHE_NAME = 'phpcon-2026-v1'

// インストール時に PHP スクリプトと集計データをプリキャッシュする
// WASM アセットはハッシュ付きのため fetch 時にキャッシュする
const PRECACHE_ASSETS = ['/php/aggregate.php', '/data/municipalities.json']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})

// GET のみキャッシュ対象（caches.put は GET 以外で TypeError をスローする）
// .wasm・/php/・/data/ へのリクエストをキャッシュファーストで処理する
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const { pathname } = new URL(event.request.url)
  if (
    pathname.endsWith('.wasm') ||
    pathname.startsWith('/php/') ||
    pathname.startsWith('/data/')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (!response.ok) return response
          const clone = response.clone()
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          )
          return response
        })
      })
    )
  }
})
