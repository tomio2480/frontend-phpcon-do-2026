# このプロジェクトの Claude Code 設定

## 実行環境

- `pnpm` は scoop 経由でインストールされており，**PowerShell の PATH に通っていない**．
  `pnpm` コマンドは必ず **Bash ツール** で実行すること．
  `PowerShell` ツールから `pnpm` を呼び出すと「command not found」になる．

## ワークツリー構成

複数セッションで並行作業するため，ブランチごとにワークツリーを分離している．

| パス | ブランチ | 用途 |
|---|---|---|
| `frontend-phpcon-do-2026/` | `phase/2-project-init`（以降は各 phase ブランチ） | Phase 2〜 |
| `frontend-phpcon-do-2026/.claude/worktrees/geojson-data/` | `worktree-geojson-data` | Phase 1 セッション A |
| `frontend-phpcon-do-2026--phase1/` | `phase/1-data-collection` | Phase 1 セッション B |

セッション開始時は `git worktree list` でブランチ割り当てを確認してから作業ブランチを選ぶこと．

## レビュー返信の注意

`reply-review.sh` の引数にバックティック（`` ` ``）を含む文字列を渡すと，
shell がコマンド置換として解釈し **コードスニペット部分が消えた状態で投稿される**．
コードを含む返信は必ず `--body-file` を使うこと．

```bash
# NG: バックティックが消える
~/.claude/bin/reply-review.sh 18 123 "修正しました．`foo()` を削除しています．"

# OK: ファイル経由で渡す
cat > /tmp/reply.txt << 'EOF'
修正しました．`foo()` を削除しています．
EOF
~/.claude/bin/reply-review.sh 18 123 --body-file /tmp/reply.txt
```

根本修正は tomio2480/settings#96 で追跡中．
