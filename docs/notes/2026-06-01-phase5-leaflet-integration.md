# Phase 5 Leaflet 地図統合の知見

## 背景

Leaflet 1.9.4 を Vite 8 + Preact 10 + TypeScript 6 の構成に組み込み，
北海道全市区町村の GeoJSON ポリゴンをブラウザ上で描画した．
Phase 6 の地図↔チェックボックス連動に備え，`onHover`/`onClick` ハンドラを仕込んでいる．

---

## 判断

### `zimmerframe` パッチは Phase 3 と共通

`@preact/preset-vite` が CJS で `zimmerframe` を `require` しようとするが，
`zimmerframe@1.1.4` は ESM-only であるため失敗する．
Vite dev サーバーを起動する Playwright E2E テストでもこのエラーが出るため，
Phase 3 と同じパッチ（`patches/zimmerframe@1.1.4.patch`）が必要だった．

Phase 3 より先に Phase 5 がマージされる場合は，Phase 3 のパッチコメントと内容を
先に合わせておくことで，Phase 3 リベース時の競合を回避できる．

### Vitest の `include` を `src/**` に限定する

Playwright の `e2e/*.spec.ts` を `testDir` に置くと，Vitest がそのファイルも走査して
「`test()` が設定ファイル内で呼ばれた」エラーになる．
`vite.config.ts` の `test.include` を `['src/**/*.test.{ts,tsx}']` に限定することで解決する．

### Playwright 設定ファイルを明示的に用意する

`package.json` に `playwright test --pass-with-no-tests` スクリプトがあっても，
`playwright.config.ts` がなければ `testDir` や `webServer` が設定されないため E2E は動かない．
`playwright.config.ts` で `testDir: './e2e'` と `webServer` を明示的に定義する必要がある．

### `afterEach(cleanup)` は明示的に呼ぶ

`@testing-library/preact` の自動クリーンアップが効かないケースがあり，
複数の `render` 呼び出し後に `getByTestId` が「複数の要素が見つかった」エラーになった．
各テストスイートで `afterEach(() => cleanup())` を明示的に登録することで解決した．

### `response.ok` チェックはシステム境界で必ず行う

`fetch('/data/hokkaido.geojson')` に `response.ok` チェックなしに `.json()` を呼ぶと，
HTTP 4xx/5xx 時に意図しない JSON パースエラーが起きる．
外部リソース取得はシステム境界であり，`if (!r.ok) throw new Error(...)` が必要．
テストのモックにも `ok: true` を含めないと，実装変更後にテストが偽陰性になる．

---

## 代替案と棄却理由

### Leaflet CSS を `main.tsx` でインポートする案

コンポーネントファイルに `import 'leaflet/dist/leaflet.css'` を置く方が
依存関係の局所化として明確であり，採用した．

### module スコープで GeoJSON fetch をキャッシュする案

`let geojsonPromise: Promise<any> | null = null` をモジュール外に置く案はレビューで提案されたが，
テスト間の状態汚染リスクと Phase 5 のスコープ（描画確認のみ）を理由に却下した．
`public/` 配下の静的ファイルはブラウザ HTTP キャッシュが処理する．
パフォーマンスが問題になった場合は Phase 12（最適化）で対処する．

### `feature?.properties?.code` に変更する案

Leaflet の `onEachFeature` コールバックは `feature: geojson.Feature`（非 null）を保証する．
`feature?.properties` とするのは発生しないシナリオへの防御であり，型情報を弱める副作用もある．
GeoJSON 仕様で `properties` 自体は null になりえるため，`feature.properties?.code` が正しい．

---

## 参照

- Issue #7: Phase 5: Leaflet 地図統合
- PR #24: feat: Phase 5 - Leaflet 地図統合
- `patches/zimmerframe@1.1.4.patch`
- Phase 3（PR #23）の zimmerframe パッチ適用の知見（同一問題）
