# 北海道市区町村パーセンテージ可視化アプリ

北海道の市区町村を選択すると，全道に対する割合（面積・人口・ふるさと納税受入額・受入件数）を
計算して表示する静的 Web アプリケーションである．
集計ロジックは PHP WASM（`@php-wasm/web`）でブラウザ内で動作する．

GitHub Pages でホストされており，サーバーサイドの実行環境を必要としない．

## 動作環境

- モダンブラウザ（Chrome / Firefox / Safari / Edge の最新版）
- iOS Safari（実機動作確認済み）

## 開発のセットアップ

前提条件として Node.js（LTS）と pnpm が必要である．

```bash
pnpm install
pnpm dev
```

ビルド・プレビュー：

```bash
pnpm build
pnpm preview
```

テスト：

```bash
pnpm test          # Vitest（単体テスト）
pnpm test:e2e      # Playwright（E2E・アクセシビリティ）
```

## データ生成スクリプト

`public/data/municipalities.json` と `public/data/total.json` は Python スクリプトで生成する．

前提条件：Python 3.11 以上，`public/data/hokkaido.geojson` が存在すること．

```bash
cd scripts
python build_municipalities.py
```

テスト（pytest）：

```bash
cd scripts
python -m pytest tests/
```

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Preact 10 + TypeScript 6 |
| ビルドツール | Vite 8 |
| CSS | Tailwind CSS 4 |
| 地図 | Leaflet 1.9.4 |
| PHP 実行 | @php-wasm/web 3.1.38（PHP 8.5） |
| パッケージ管理 | pnpm |
| ホスティング | GitHub Pages |

## ライセンス

このリポジトリのソースコードは [GNU General Public License v2.0 or later](./LICENSE)
のもとで公開されている．

本アプリは `@php-wasm/web`（GPL-2.0-or-later）を静的ファイルとして同梱頒布するため，
本リポジトリも同ライセンスを採用する．

## データの出典と帰属表示

本アプリが使用するデータの出典は以下のとおりである．

### 面積データ

- **算出方法**：`public/data/hokkaido.geojson` のポリゴンから計算した近似値
- **GeoJSON 出典**：国土交通省「国土数値情報 行政区域データ」
- **利用規約**：[国土数値情報ダウンロードサービス利用規約](https://nlftp.mlit.go.jp/ksj/other/yakkan.html)
- **精度**：GeoJSON 簡略化に伴い公式値と最大 ±20% 程度の差が生じる

### 人口データ

- **出典**：総務省「住民基本台帳に基づく人口，人口動態及び世帯数」
- **利用規約**：[政府標準利用規約（第 2.0 版）](https://www.digital.go.jp/resources/open_data/government-standard-terms-of-use/)

### ふるさと納税データ

- **出典**：総務省「ふるさと納税に関する現況調査結果」
- **利用規約**：[政府標準利用規約（第 2.0 版）](https://www.digital.go.jp/resources/open_data/government-standard-terms-of-use/)

### 地図データ（GeoJSON）

- **出典**：© OpenStreetMap contributors
- **利用規約**：[Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/)
- 地図タイルは使用せず，市区町村境界の GeoJSON のみ使用する

> 上記データ自体には GPL は適用されない．各出典の利用規約に従う．
