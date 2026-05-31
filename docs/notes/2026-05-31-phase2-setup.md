# Phase 2 プロジェクト初期化で得た知見

## 背景

Vite 8 + Preact 10 + TypeScript 6 + Tailwind CSS 4 のプロジェクトスキャフォールドを構築した．
PHP WASM を組み込む Phase 3 以降の基盤となる設定群について，
判断と詰まった点を記録する．

## 判断

### TypeScript project references + noEmit 構成

`tsconfig.json` の `references` を使って `tsconfig.app.json` / `tsconfig.node.json` に分割し，
どちらにも `"noEmit": true` を設定する．
`pnpm build` スクリプトを `tsc -b && vite build` とすることで，
`tsc -b` を **型チェック専用** として使い，JS のコンパイルは Vite（esbuild）に任せる．

この構成では `composite: true` は **不要**．
`composite` は `.d.ts` ファイルを出力して他プロジェクトに提供するための機能であり，
型チェック専用（noEmit）では意味を持たない．
Vite 公式テンプレートもこのパターンを採用している．

### Tailwind CSS 4 の設定方法

v3 と大きく変わった点として記録する．

- `postcss.config.js` は不要．`@tailwindcss/vite` プラグインを `vite.config.ts` に追加するだけ．
- CSS ファイルに `@import "tailwindcss"` と書く（v3 の `@tailwind base/components/utilities` ではない）．
- カスタムカラーは `tailwind.config.js` ではなく CSS の `@theme {}` ブロックで定義する．

```css
@import "tailwindcss";

@theme {
  --color-background: #FFF6D5;
}
```

## 代替案と棄却理由

### `composite: true` の追加（gemini-code-assist 指摘）

TypeScript project references の仕様上は参照されるプロジェクトに `composite: true` が推奨されている．
しかし `noEmit: true` との組み合わせでは意味がなく，
Vite 公式テンプレートもこの設定を持たない．
実際に `pnpm build` が通っていることも確認済みのため却下した．

### PostCSS 経由での Tailwind CSS 4 設定

`@tailwindcss/vite` プラグインの方がパフォーマンスが高く，設定も簡潔なため不採用．

## 詰まった箇所

### `tsconfig.node.json` の `noEmit: true` 欠落

当初 `tsconfig.node.json` に `noEmit: true` を入れ忘れた結果，
`tsc -b` が `vite.config.js` を出力し続けた．
初動で `.gitignore` に逃がすワークアラウンドを採用したが，
gemini-code-assist のレビューで根本修正（`noEmit: true` 追加）に至った．

**教訓**：`tsconfig.app.json` だけでなく `tsconfig.node.json` にも必ず `noEmit: true` を入れる．

### ctx7 を Windows Git Bash で実行したときのパス解釈

`/owner/repo` 形式のライブラリ ID を Bash ツールで渡すと，
Git Bash が先頭の `/` を Windows のドライブルートとして解釈し `C:/Program Files/Git/owner/repo` になる．
**PowerShell ツールで実行する**ことで回避できる．

## 参照

- PR: tomio2480/frontend-phpcon-do-2026#18
- フォローアップ Issue: tomio2480/settings#93〜#96
