# Phase 3 PHP WASM 組み込みで得た知見

Phase 3（PHP WASM 組み込み）の実装で詰まった箇所・設計判断・
レビュー対応から得た知見を記録する．

## 目次

1. 背景
2. Vite 8 × @php-wasm/web の設定判断
3. PHP WASM シングルトンの実装パターン
4. zimmerframe CJS 問題への対処
5. パス解決の落とし穴
6. Vitest モック設計
7. 代替案と棄却理由
8. 参照

---

## 背景

`@php-wasm/web 3.1.35` を Vite 8（rolldown 採用）+ Preact 環境に組み込む際，
Vite の事前バンドル処理と PHP WASM の動的インポート構造が衝突する問題が多発した．
また，`@preact/preset-vite` が依存する `zimmerframe` が CJS に非対応で，
dev サーバーとテスト環境の両方でエラーが発生した．

---

## Vite 8 × @php-wasm/web の設定判断

### `@php-wasm/web` を `optimizeDeps.exclude` に入れる

`@php-wasm/web` を事前バンドルに含めると rolldown が
`../intl/shared/icu.dat`（intl 未使用時は存在しない）を
静的解決しようとして失敗する．
また各バージョンパッケージの `./asyncify/extensions/intl/intl.so?url` が
Windows では `os error 123` を起こす（`?url` 付きパスの処理不可）．

除外することでブラウザ要求時に Vite が直接変換するパスを採る．

### `@php-wasm/universal` は除外しない

`@php-wasm/universal` は CJS パッケージ `ini` を ESM として `import` するため，
事前バンドルの CJS → ESM interop が必要になる．
除外すると named export エラーが発生する．

### `resolveIcuDat` カスタムプラグイン

`@php-wasm/web` を除外すると `../intl/shared/icu.dat` の動的インポートが
Vite の変換フェーズで未解決のままになる．
`resolveId` フックでパッケージ内の実際の `icu.dat` へリダイレクトする．

```ts
function resolveIcuDat(): Plugin {
  const webPkgRoot = findPackageRoot(require.resolve('@php-wasm/web'))
  const icuDatPath = join(webPkgRoot, 'shared', 'icu.dat').replace(/\\/g, '/')
  return {
    name: 'resolve-icu-dat',
    resolveId(source) {
      if (source === '../intl/shared/icu.dat') return icuDatPath
    },
  }
}
```

---

## PHP WASM シングルトンの実装パターン

`instance` のみキャッシュすると並行呼び出し時に `loadWebRuntime` が複数回走る．
`initPromise` ごとキャッシュし，同一 Promise を共有する必要がある．

加えて `_resetForTesting()` 後に古い Promise が完了すると `instance` を上書きする
テスト汚染が起きる．クロージャで `initPromise === promise` を確認することで防ぐ．

```ts
const promise = loadWebRuntime('8.5')
  .then(runtime => {
    const phpInstance = new PHP(runtime)
    if (initPromise === promise) instance = phpInstance  // リセット後は代入しない
    return phpInstance
  })
  .catch(err => {
    if (initPromise === promise) initPromise = null      // 失敗時は再試行可能に
    throw err
  })
initPromise = promise
```

---

## zimmerframe CJS 問題への対処

`@preact/preset-vite` の `preact:transform-hook-names` が
`require('zimmerframe')` を呼ぶが，zimmerframe は ESM-only のため失敗する．

`pnpm patch` で `walk.cjs`（CJS ラッパー）と `require` 条件を追加した．
テスト環境では `devToolsEnabled: !process.env.VITEST` で
hook names 変換自体を無効化することでも回避できる．

---

## パス解決の落とし穴

### `node_modules` のハードコードは避ける

`resolve(__dirname, 'node_modules/@php-wasm/web/shared/icu.dat')` は
pnpm 厳格レイアウトやモノレポで失敗する．
`require.resolve` でパッケージを特定し，相対パスを組み立てる．

### `require.resolve('pkg/package.json')` の危険性

`package.json` の `exports` に `./package.json` が含まれない場合，
Node.js の厳格なエクスポート解決で `ERR_PACKAGE_PATH_NOT_EXPORTED` が発生する．
パッケージ本体エントリを `require.resolve('pkg')` で解決し，
`package.json` が見つかるまで親を辿る `findPackageRoot` 関数を使う．

### Windows でのパス正規化

`path.join` は Windows でバックスラッシュを返す．
Vite の `resolveId` フックに渡す前に `.replace(/\\/g, '/')` で正規化する．

---

## Vitest モック設計

### `vi.hoisted()` で TDZ 問題を解決

`vi.mock()` はホイストされるため，ファクトリ内で `const mockRun = vi.fn()`
のような変数を参照すると Temporal Dead Zone エラーになる．
`vi.hoisted()` でも同様にホイストされる変数を定義することで解決する．

```ts
const { mockRun } = vi.hoisted(() => ({ mockRun: vi.fn() }))
vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockResolvedValue({ run: mockRun }),
}))
```

### `screen.findByText` vs `document.querySelector`

`document.querySelector` は @testing-library の抽象から外れる．
非同期要素の待機には `screen.findByText` を使い，
`waitFor` との二重待機を避ける．

---

## 代替案と棄却理由

### `@php-wasm/web` を事前バンドルに含める（棄却）

rolldown が `intl.so?url` を処理できず（Windows: `os error 123`），
`icu.dat` の解決も失敗するため除外を採用した．

### `seanmorris/php-wasm` の採用（棄却）

実装計画で検討済み．更新頻度・モジュール構成の観点で
WordPress Playground 系（`@php-wasm/web`）を優先した．

---

## 参照

- PR #23: https://github.com/tomio2480/frontend-phpcon-do-2026/pull/23
- PHP run 直列化 ToDo (Issue #6): https://github.com/tomio2480/frontend-phpcon-do-2026/issues/6#issuecomment-4588171542
