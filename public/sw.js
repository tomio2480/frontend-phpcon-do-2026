const CACHE_NAME = 'phpcon-2026-v1'

// self.location.pathname からベースパスを導出する（サブディレクトリデプロイ対応）
// 例: SW が /hokkaido-percentage/sw.js に置かれる場合 base = '/hokkaido-percentage'
const base = self.location.pathname.replace(/\/[^/]*$/, '')

// インストール時に PHP スクリプトと集計データをプリキャッシュする
// WASM アセットはハッシュ付きのため fetch 時にキャッシュする
const PRECACHE_ASSETS = [
  base + '/php/aggregate.php',
  base + '/data/municipalities.json',
]

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
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const { pathname } = new URL(event.request.url)

  // .wasm はハッシュ付きのためキャッシュファーストで処理する
  if (pathname.endsWith('.wasm')) {
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
    return
  }

  // /php/・/data/ はハッシュなしのためネットワークファーストで処理する
  // includes でサブディレクトリデプロイにも対応する
  if (pathname.includes('/php/') || pathname.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response.ok) return response
          const clone = response.clone()
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          )
          return response
        })
        .catch(() => caches.match(event.request))
    )
  }
})
