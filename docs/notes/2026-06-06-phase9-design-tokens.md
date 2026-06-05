# Phase 9: デザイン適用・北海道カラートークン

Phase 9 では Tailwind CSS v4 のデザイントークン導入，PHP WASM 初期化状態の UI 伝播，
アクセシビリティ対応（`inert` 属性）を実施した際の知見をまとめる．

## 目次

- [Tailwind CSS v4 の `@theme` によるトークン定義](#tailwind-css-v4-の-theme-によるトークン定義)
- [Leaflet の `setStyle()` と CSS カスタムプロパティの制約](#leaflet-の-setstyle-と-css-カスタムプロパティの制約)
- [PHP WASM 初期化状態の UI 伝播設計](#php-wasm-初期化状態の-ui-伝播設計)
- [`inert` 属性によるアクセシビリティ制御](#inert-属性によるアクセシビリティ制御)
- [`vi.useFakeTimers()` と `act` の使い分け](#viusefaketimers-と-act-の使い分け)
- [`vi.hoisted()` で Leaflet イベントハンドラを捕捉する](#vihoisted-で-leaflet-イベントハンドラを捕捉する)

## Tailwind CSS v4 の `@theme` によるトークン定義

`@theme` ブロック内に `--color-*` 形式で記述すると，
Tailwind がユーティリティクラスとして認識する．

```css
@import "tailwindcss";
@theme {
  --color-background: #FFF6D5;
  --color-accent-lilac: #D8B7DD;
  --color-text: #3B3645;
}
```

これにより `bg-background`，`text-text`，`border-accent-lilac/40` などの
クラスが使えるようになる．`/40` のような不透明度修飾子も機能する．

## Leaflet の `setStyle()` と CSS カスタムプロパティの制約

### 判断

Leaflet の `setStyle()` はカスタムプロパティを解決できないため，
カラー値をハードコードする．コメントで tokens.css との対応を明記して追従漏れを防ぐ．

```ts
/* トークン対応: --color-accent-lilac / --color-accent-lavender / --color-map-default */
const STYLE_SELECTED = { fillColor: '#D8B7DD', fillOpacity: 0.6 }
```

### 代替案と棄却理由

**`var(--color-accent-lilac)` を直接渡す**: Leaflet の `setStyle()` は
SVG の `fill` 属性に直接書き込む（DOM プロパティ経由ではない）ため，
ブラウザのスタイル解決が働かず `var(...)` が文字列のまま残る．

**`className` + CSS で制御**: CSS 変数は使えるが，
`mouseover` / `mouseout` / `click` ハンドラでのスタイル切り替えを
すべてクラス付け替えに変える必要がある．今フェーズのスコープ外と判断した．

## PHP WASM 初期化状態の UI 伝播設計

`usePhp` が返す `phpStatus: 'loading' | 'ready' | 'error'` を，
`useAggregate` でブーリアンフラグに変換して返す．

```ts
export type UseAggregateResult = {
  result: AggregateResult | null
  error: Error | null
  isCalculating: boolean
  isPhpLoading: boolean   // phpStatus === 'loading'
  isPhpError: boolean     // phpStatus === 'error'
}
```

### 設計判断

`isPhpError` を `error` にマージしない判断をした．
PHP 初期化エラー（ページリロードが必要）と集計エラー（再計算可能）は
原因と対処が異なり，UI で区別したいため別フラグに分離する．

### 新しい集計開始時のエラークリア

`useEffect` 内でデバウンス前に `setError(null)` を置くことで，
`selectedCodes` 変更と同時に前回エラーを消す．

```ts
if (debounceRef.current) clearTimeout(debounceRef.current)
setError(null)   // 選択変更時に即クリア（デバウンス前）
debounceRef.current = setTimeout(async () => { ... }, 75)
```

## `inert` 属性によるアクセシビリティ制御

PHP 初期化中・初期化エラー時にインタラクティブ要素への
キーボードフォーカスとポインタ操作をまとめて無効化できる．

```tsx
<div inert={isPhpLoading || isPhpError || undefined}>
  <HokkaidoMap ... />
  ...
</div>
```

`false || undefined` は `undefined` となり属性が付かない．
Preact 10.x の JSX 型定義では `inert?: Signalish<boolean | undefined>` として定義済みで，
型エラーは発生しない．

`role="alert"` のエラーメッセージは `inert` ブロック外に置くことで
スクリーンリーダーへの読み上げを確保している．

## `vi.useFakeTimers()` と `act` の使い分け

`vi.useFakeTimers()` が有効な `describe` ブロックでは，
`waitFor` が内部で `setTimeout` を使うため永久に待ち続ける．
代わりに `act` を使う．

```ts
// NG: vi.useFakeTimers() 環境では waitFor がタイムアウトする
await waitFor(() => expect(result.current.isPhpLoading).toBe(false))

// OK: Promise のみ待つ場合
await act(async () => {})
expect(result.current.isPhpLoading).toBe(false)

// OK: fake timer が絡む場合（rejected Promise チェーンのフラッシュが必要）
await act(async () => { await vi.runAllTimersAsync() })
expect(result.current.isPhpError).toBe(true)
```

`act(async () => {})` は pending Promise をフラッシュするが，
rejected Promise チェーンには不十分な場合がある．
その場合は `vi.runAllTimersAsync()` を組み合わせる．

## `vi.hoisted()` で Leaflet イベントハンドラを捕捉する

Leaflet の `layer.on(event, handler)` をテストで呼び出すには，
モック内でハンドラを `vi.hoisted()` 経由のオブジェクトに保存する．

```ts
const capturedHandlers = vi.hoisted<{
  current: Array<Record<string, () => void>>
}>(() => ({ current: [] }))

vi.mock('leaflet', () => ({
  default: {
    geoJSON: vi.fn().mockReturnValue({
      addTo: vi.fn(),
    }),
    // geoJSON の onEachFeature 内で呼ばれる layer.on をキャプチャ
  },
}))
```

テスト内で `capturedHandlers.current[0].mouseover?.()` のように
呼び出すことでホバー・クリックのスタイル変化を検証できる．

## 参照

- PR #36: <https://github.com/tomio2480/frontend-phpcon-do-2026/pull/36>
- Issue #11: Phase 9 デザイン適用・北海道カラートークン
