# GitHub Pages 公開・データ出典検証・UI 改善の知見

本ノートは，GitHub Pages への公開時に顕在化した複数の不具合と，
そのデバッグ・修正の知見をまとめる．対象は，Pages のビルド方式，
サブディレクトリ配信，PHP WASM の起動要件，ライト/ダークテーマ，
政府公式データの出典検証，読み込み時のちらつき解消である．

## 目次

- 1. GitHub Pages のビルド方式（legacy と workflow）
- 2. サブディレクトリ配信でのパス解決
- 3. PHP WASM 起動と Cross-Origin Isolation
- 4. PHP バージョン選定（未リリース版の回避）
- 5. ライト/ダークテーマと配色アクセシビリティ
- 6. データ出典の一次資料検証
- 7. 読み込み時のちらつき解消

## 1. GitHub Pages のビルド方式

### 背景

デプロイ用 GitHub Actions を整備済みにもかかわらず，
公開ページが白画面となり，`%BASE_URL%sw.js` の 400 エラーが出ていた．

### 判断

原因は Pages のビルド方式が `legacy`（`main` ブランチのソースを
そのまま配信）であったこと．Actions でビルドされず，未コンパイルの
`index.html` がそのまま配信され `%BASE_URL%` が未置換であった．

### 対応

`gh api repos/OWNER/REPO/pages -X PUT -f build_type=workflow` で
ビルド方式を `workflow` に変更．手動再実行のため `deploy.yml` に
`workflow_dispatch` を追加した．

## 2. サブディレクトリ配信でのパス解決

リポジトリ名配下（`/REPO/`）に配信されるため，ルート絶対パスの
`fetch('/data/...')` が 404 となった．`import.meta.env.BASE_URL` を
基点とする相対参照へ統一して解決した．

## 3. PHP WASM 起動と Cross-Origin Isolation

`@php-wasm/web` は `SharedArrayBuffer` を要求し，これには
COOP/COEP ヘッダーによる Cross-Origin Isolation が必須である．
GitHub Pages は応答ヘッダーを設定できないため，`coi-serviceworker`
を導入し Service Worker 経由でヘッダーを注入した．

注意点として，`Ctrl+Shift+R`（強制リロード）は Service Worker を
バイパスするため `coi-serviceworker` が機能しない．動作確認は通常の
ナビゲーションで行う必要がある．

## 4. PHP バージョン選定

`@php-wasm/web-8-5`（PHP 8.5）で `Runtime with id 1 not found` が
発生した．PHP 8.5 は未リリースで WASM ビルドが不安定であったため，
安定版の PHP 8.4（`@php-wasm/web-8-4`）へ切り替えて解消した．
ライブラリの最新版が必ずしも安定とは限らない好例である．

## 5. ライト/ダークテーマと配色

### 設計

`prefers-color-scheme` を JS で読み取り `html[data-theme]` を付与．
`localStorage` で手動設定を永続化し，FOCT 防止のため `<head>` の
インラインスクリプトでレンダリング前にテーマを確定した．

配色は Analogous 配色（基軸 hue 270° のラベンダー＋アクセント hue
48° の菜の花色）とし，本文コントラストを WCAG 2.1 AAA 相当で確保．

### 詰まった点：Tailwind v4 と白背景ハードコード

ダークモードで「文字が見えない」症状が出た．主要トークンの
カスケードは正しく，原因はカード類の `bg-white` ハードコードだった．
ダークモードで文字色のみ明色化し，白背景が残るため判読不能となる．
`surface` トークン（ライト白／ダーク暗紫）を新設して解消した．

教訓として，テーマ対応では「色トークンを変える」だけでなく，
固定色（`bg-white` 等）の混入を全コンポーネントで洗う必要がある．

### Opus レビューによる WCAG 非準拠の発見

ライトモードの境界線（菜の花色 `#F5C800`）は白背景に対し約 1.3:1 で，
非テキストの 3:1 要件を満たさなかった．深いゴールド `#8B7000`
（4.5:1）へ変更した．ダークではホバーが暗化方向で背景に溶けるため
明化方向へ修正した．

## 6. データ出典の一次資料検証

### 経緯

フッターのデータ出典が省庁トップページへのリンクに留まり，
一部にコード内で第三者サイト（`hokkaidodo.jp`）を出典とする
記述があった．政府公式の一次資料へ差し替える方針とした．

### 北方領土6村の検証

色丹村・泊村・留夜別村・留別村・紗那村・蘂取村の6村は，
`01695`〜`01700` の正式な全国地方公共団体コードを持つことを
Mapion・Yahoo 地図・総務省コード一覧で確認した．歯舞群島には
村が存在しないため「北方領土に置かれた6村」と表記する．

### ふるさと納税データの年度ラベル誤り

総務省の公式 Excel（各団体の受入額及び受入件数）をダウンロードし，
全179市町村を突合した．結果，本プロジェクトの値は全件が
**令和6年度実績**（令和7年度実施調査）と一致し（177件完全一致，
2件は千円丸めで±5円差），令和5年度との一致は0件であった．
従来ラベル「令和6年度実施（令和5年度実績）」は誤りと判明し，
「令和7年度実施（令和6年度実績）」へ修正した．値自体は公式と
一致しており正確だったため，数値は変更していない．

教訓として，外部から受領した数値は，出典の正式名称・基準年度まで
一次資料で突合して初めて「検証済み」と言える．数値一致だけでなく
年度ラベルの整合まで確認する．

## 7. 読み込み時のちらつき解消

初回読み込みで地図やコンテンツが描画途中に見え隠れし，画面が
点滅していた．原因は，ローディングオーバーレイが半透明で背後の
描画が透け，かつ PHP 読み込みのみに連動して地図 GeoJSON の描画
完了を待たずに消えていたこと．

対応として，オーバーレイを不透明＋スピナーへ変更し，`HokkaidoMap`
に `onReady` を追加．PHP と地図の双方が整うまでローディング画面
のみを表示する `isInitializing` ゲートを設けた．
`prefers-reduced-motion` 時はアニメーションを停止する配慮も加えた．

## 参照

- 関連 PR: main への直接コミット群（2026-06-14）
- 総務省 全国地方公共団体コード: https://www.soumu.go.jp/denshijiti/code.html
- 国土地理院 面積調: https://www.gsi.go.jp/KOKUJYOHO/MENCHO-title.htm
- 総務省 住民基本台帳人口: https://www.soumu.go.jp/main_sosiki/jichi_gyousei/daityo/jinkou_jinkoudoutai-setaisuu.html
- 総務省 ふるさと納税 関連資料: https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/furusato/archive/
- coi-serviceworker: https://github.com/gzuidhof/coi-serviceworker
