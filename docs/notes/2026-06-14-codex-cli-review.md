# Codex CLI でのコードレビュー実施知見

## 背景

Phase 13 の PR レビュー時に，OpenAI の `@openai/codex` CLI（`codex review`）を
用いてコードレビューを試みた．

## 判断

Codex CLI は OpenAI API の従量課金を利用する．Claude サブスクリプションとは別課金．

`codex review --base main` を実行したところ：
- `git grep` が `dist/` 配下の PHP WASM バイナリ（ICU データ等）に当たった
- 出力が 2MB・10,000 行超のノイズになった
- 最終的な verdict は「No discrete, actionable bugs identified」で有用だった

## 代替案と棄却理由

今回は `dist/` 除外を事前に設定しなかったため，ノイズが発生した．

## 次回への対応

`codex review` 実行前に `.codexignore` または相当の設定で `dist/` を除外する．

```
# .codexignore（仮）
dist/
node_modules/
```

あるいは `--base main` の代わりに差分を絞ったファイル指定でレビューする方が
費用対効果がよい可能性がある．

コスト感：差分 1,100 行 + バイナリ読み込みで数十〜数百円程度（モデル gpt-5.5 使用）．
通常の Python スクリプト差分のみなら 1 桁安くなると推定する．

## 参照

- PR #50 のレビュー対応（2026-06-14）
- Codex CLI ドキュメント: https://github.com/openai/codex
