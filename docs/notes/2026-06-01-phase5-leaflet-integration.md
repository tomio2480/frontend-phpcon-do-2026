# Phase 5 Leaflet 地図統合の知見

## 背景

Leaflet 1.9.4 を Vite 8 + Preact 10 + TypeScript 6 の構成に組み込んだ．
北海道の各市区町村について，GeoJSON ポリゴンをブラウザ上で描画している．
Phase 6 の地図↔チェックボックス連動に備え，`onHover`/`onClick` ハンドラを仕込んでいる．

---

## 判断

### `zimmerframe` パッチは Phase 3 と共通

`@preact/preset-vite` は CJS 形式で `zimmerframe` を `require` しようとする．
`zimmerframe@1.1.4` は ESM-only であるため，この呼び出しは失敗する．
Playwright の E2E テストも Vite dev サーバーを起動するため同じエラーが出る．
Phase 3 と同じパッチ（`patches/zimmerframe@1.1.4.patch`）の適用が必要だった．

Phase 5 が Phase 3 より先にマージされる場合は，パッチの内容とコメントを事前に合わせておく．
Phase 3 のリベース時の競合を回避できる．

### Vitest の `include` を `src/**` に限定する

Playwright の `e2e/*.spec.ts` を `testDir` に置くと，Vitest の走査対象に入る．
`test()` が設定ファイル内で呼ばれたとみなされ，エラーが発生する．
`vite.config.ts` の `test.include` を `['src/**/*.test.{ts,tsx}']` に限定することで解決する．

### Playwright 設定ファイルを明示的に用意する

`playwright.config.ts` がなければ `testDir` や `webServer` を設定できない．
`package.json` にスクリプトがあっても E2E は動かない．
`playwright.config.ts` で `testDir: './e2e'` と `webServer` を明示的に定義する必要がある．

### `afterEach(cleanup)` は明示的に呼ぶ

`@testing-library/preact` の自動クリーンアップが機能しないケースがあった．
複数の `render` 後に `getByTestId` で「複数の要素が見つかった」エラーが発生した．
Vitest の `test.globals` はデフォルト `false` であり，グローバルな `afterEach` が存在しない．
各テストスイートで `afterEach(() => cleanup())` を明示的に登録して解決した．
`vite.config.ts` で `test.globals: true` にすれば自動クリーンアップが機能し記述を省ける．

### `response.ok` チェックはシステム境界で必ず行う

`response.ok` を確認せず `.json()` を呼ぶと，HTTP 4xx/5xx で意図しない JSON パースエラーが起きる．
外部リソース取得はシステム境界であり，`if (!r.ok) throw new Error(...)` が必要．
テストのモックにも `ok: true` を含めないと，実装変更後にテストが偽陰性になる．

---

## 代替案と棄却理由

### Leaflet CSS を `main.tsx` でインポートする案

コンポーネントファイルに `import 'leaflet/dist/leaflet.css'` を置く方が
依存関係の局所化として明確であり，採用した．

### module スコープで GeoJSON fetch をキャッシュする案

モジュール外にキャッシュ変数 `let geojsonPromise: Promise<any> | null = null` を置く案がレビューで提案された．
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
