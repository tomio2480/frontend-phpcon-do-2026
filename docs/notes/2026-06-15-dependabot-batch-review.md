# Dependabot PR 一括レビュー・取り込みの知見

本ノートは，Dependabot が起票した依存更新 PR 10 件を取り込んだ知見をまとめる．
取り込みはサプライチェーン攻撃を念頭に調査したうえで実施した．
扱う論点は SHA 検証手順・CI 空走・版コメント乖離・ロックファイル競合の 4 点である．

## 目次

- 1. 背景
- 2. SHA ピンした Actions 更新の正当性検証
- 3. Dependabot PR で実テストが走らない落とし穴
- 4. SHA は更新されても版コメントは更新されない
- 5. 連続マージ時のロックファイル競合
- 6. 参照

## 1. 背景

GitHub Pages で公開中のリポジトリに対し，Dependabot が 10 件の
更新 PR を起票していた．内訳は GitHub Actions が 5 件，npm の
`devDependencies` が 5 件である．近年のサプライチェーン攻撃を
考慮し，取り込みの妥当性を調査したうえでマージする方針とした．

## 2. SHA ピンした Actions 更新の正当性検証

### 背景

本リポジトリの third-party Actions は full commit SHA でピンしている．
Dependabot はタグではなく SHA を書き換える PR を出す．攻撃者が
不正な SHA を紛れ込ませる経路がここに存在する．

### 判断

新しい SHA が，主張するバージョンタグの指す commit と一致するかを
上流リポジトリの API で突合する．一致すれば改ざんなしと判断できる．

### 対応

各 Actions PR について次のコマンドで上流タグを解決し，PR の SHA と
照合した．5 件すべて一致を確認した．

```bash
gh api repos/actions/setup-node/commits/v6.4.0 --jq .sha
# → PR が書き換える SHA と一致するか目視照合
```

annotated タグでも `commits/<tag>` は commit SHA まで解決するため，
そのまま比較できる．

## 3. Dependabot PR で実テストが走らない落とし穴

### 背景

種別ごとの対応方針では「CI 通過確認後にマージ」を原則とする．
しかし本リポジトリの CI はトリガーが限定されていた．

- `deploy.yml`: `push: main` のみ（PR では走らない）
- `md-lint.yml`: `**/*.md` 変更時のみ
- CodeQL: 当該差分では skipping

### 判断

結果として Dependabot PR では実テストとビルドのいずれも走らない．
CI は実質ノーガードであり，「CI 通過確認」を自動結果に頼れない．

### 対応

npm 5 件（jsdom 26→29 の major を含む）を 1 ブランチへまとめて反映した．
ローカルで `pnpm test`（82 passed）と `pnpm build` の成功を確認してからマージした．
Actions の major は GitHub 上でしか実行できない．
そのため SHA 検証と公式ソースで判断し，マージ後の deploy 成功を実地検証とした．

恒久対策としては，`pull_request` トリガーの軽量テストジョブを追加し，
Dependabot PR にもゲートをかける構成が望ましい．

## 4. SHA は更新されても版コメントは更新されない

### 背景

Actions の major 更新後，ワークフロー内の併記コメントが旧版表記のまま残っていた．
例えば SHA が v6.4.0 を指すのに，コメントは `# v4` のままであった．

### 判断

Dependabot が書き換えるのは SHA のみである．人間向けの版コメントは更新しない．
major 更新を重ねるたびに，コメントと実バージョンが乖離する．
これは監査時の誤認を招く．
別行コメントだけでなく，パス指定 Action の inline コメントも更新されない事例を確認した．

### 対応

マージ後に別 PR でコメントを実 SHA に対応する版へ同期した．対象は計 6 箇所である．

- `deploy.yml`: checkout・setup-node・configure-pages・upload-pages-artifact
- `md-lint.yml`: checkout・`github-workflows`

## 5. 連続マージ時のロックファイル競合

### 背景

npm 系 PR は `package.json` と `pnpm-lock.yaml` を変更する．連続して
マージすると後続 PR でロックファイルが競合する．

### 判断

同じロックファイル領域に触れる PR のみが競合する．例えば
`@vitest/coverage-v8` と `vitest` は同領域で競合したが，`tailwindcss` や
`jsdom` は別領域のため競合しなかった．

### 対応

競合した 1 件のみ `@dependabot rebase` を投げ，`CLEAN` 化を待って
マージした．Actions 5 件はロックファイルを触らないため競合せず，
先にまとめてマージできた．

## 6. 参照

- 対象リポジトリ: `tomio2480/frontend-phpcon-do-2026`
- マージした PR: #47 および #52〜#60
- コメント同期 PR: #62
- 関連 Skill: `github-dev`（Dependabot による依存関係管理）
