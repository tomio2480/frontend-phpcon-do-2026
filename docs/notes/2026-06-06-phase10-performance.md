# Phase 10 パフォーマンス最適化の知見

## 背景

- PHP WASM の初期化コストと集計レイテンシを許容範囲に収めるため，Service Worker キャッシュ・WASM preload・デバウンス確認を実施した．
- 実装 PR: #38，対応 Issue: #12

## 判断

### WASM preload の注入方法

ビルドアーティファクト（`php_8_5-*.wasm`）はハッシュ付きファイル名のため，`index.html` に静的に書けない．
Vite プラグインの `transformIndexHtml`（`order: 'post'`）で `ctx.bundle` を参照し，ビルド時に動的注入する方針を採用した．
`generateBundle` + 外部変数の構成は実行順序依存があるため，`ctx.bundle` 単体参照の方がクリーンである（Gemini 指摘で改善）．

### SW のキャッシュ戦略分離

ハッシュ付きアセット（`.wasm`）とハッシュなしアセット（`/php/`・`/data/`）でキャッシュ戦略を分けることが重要．

- `.wasm` → キャッシュファースト（ハッシュが変わるまで更新なし，サイズが大きいため初回以降はキャッシュから返す）
- `/php/`・`/data/` → ネットワークファースト（ハッシュなしのためキャッシュファーストでは stale になる）

初期実装ではすべてキャッシュファーストにしていたが，Gemini レビューで指摘を受けて修正した．

### ネットワークファーストのフォールバック設計

ネットワークファーストの場合，`fetch` 失敗（オフライン）だけでなくサーバーエラー（5xx）時にもキャッシュフォールバックを行う必要がある．

```javascript
fetch(event.request)
  .then(response => {
    if (response.ok) {
      // キャッシュに書き込んで返す
    }
    // 5xx 時: キャッシュがあれば返す，なければエラーレスポンスを返す
    return caches.match(event.request).then(cached => cached || response)
  })
  .catch(() => caches.match(event.request))  // オフライン時
```

### SW のベースパス対応

GitHub Pages はリポジトリ名をサブディレクトリとしてデプロイする（例: `/hokkaido-percentage/`）．
SW ファイル内では `self.location.pathname.replace(/\/[^/]*$/, '')` でベースパスを動的取得し，プリキャッシュ URL・パス判定の両方に適用する．

SW 登録側では `%BASE_URL%sw.js` を使う（Vite が `base` 設定に応じて展開する）．

### Vite プラグインの `configResolved` 活用

`base` と `build.assetsDir` は `configResolved` フックで取得する．ハードコードすると設定変更時に壊れる．

```typescript
configResolved(config) {
  base = config.base || '/'
  assetsDir = config.build?.assetsDir || 'assets'
},
```

## 代替案と棄却理由

| 案 | 棄却理由 |
|---|---|
| Web Worker で PHP 実行 | GitHub Pages で COOP/COEP ヘッダー設定不可 |
| vite-plugin-pwa（Workbox） | 今回のキャッシュ要件には過剰 |
| WASM ファイルを `public/` に手動コピー | ハッシュなしになり CDN キャッシュ効率が低下 |

## 参照

- Issue #12: Phase 10 パフォーマンス最適化
- PR #38: feat: Phase 10
