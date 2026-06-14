# Phase 13 ETL 分離設計と実装知見

## 背景

`scripts/build_municipalities.py` に面積・人口・ふるさと納税データがハードコードされていた．
データ更新のたびに，ソースコードを直接編集する必要があった．
Phase 13 でデータとコードを分離する ETL 構成に移行した．

## 判断

### ETL スクリプトの分割方針

データソースの性質に合わせて 3 スクリプトに分割した．

| スクリプト | データソース | 更新頻度 |
|---|---|---|
| `etl_area.py` | `public/data/hokkaido.geojson`（ジオメトリ計算） | GeoJSON 更新時 |
| `etl_population.py` | `scripts/data/population.csv` | 年1回（住民基本台帳） |
| `etl_furusato.py` | `scripts/data/furusato.csv` | 年1回（総務省の現況調査） |

`build_municipalities.py` の `MUNICIPALITIES` を 4 列に縮小した．
`(code, name, display_name, region)` のみを保持し，残りは ETL 経由で結合する．

### 面積値に公式統計ではなく GeoJSON 計算値を採用した理由

- 公式値（国土地理院「全国の都道府県・市区町村別の面積調」）は別途 CSV 管理が必要になる
- `hokkaido.geojson` はすでにリポジトリに存在するため追加ファイル不要
- 簡略化 GeoJSON による誤差は ±20% 程度だが，本アプリの用途（割合表示）では許容範囲

ただし簡略化 GeoJSON の面積は公式値と乖離することを
`README.md`・`build_municipalities.py` ドキュメントに明記した．

### 札幌市ふるさと納税の按分方式

`furusato.csv` は `01100`（札幌市全体）を 1 行で管理する．
`etl_furusato.py` が人口比で 10 区（`01101`〜`01110`）に按分する．

```
01100,3904088764,208028  # 市全体 → etl_furusato.py が展開
```

端数は最後の区（清田区 `01110`）で吸収し，合計を目標値に一致させる．

既知の制約として，定数 `SAPPORO_FURUSATO_AMOUNT` と `SAPPORO_FURUSATO_COUNT` が CSV と二重管理になっている．
この定数は `build_municipalities.py` に残っており，将来は CSV を単一ソースとして削除を検討する．

### バリデーション設計

レビュー指摘（Gemini Code Assist）を受け，Fail Fast 原則で以下を追加した．

- `etl_population.py`: 人口 `<= 0` で `ValueError`
- `etl_furusato.py`: 金額・件数 `< 0` で `ValueError`（0 は有効値）
- `etl_furusato.py`: 按分前に全 10 区コードの存在を確認，欠損で `ValueError`
- `etl_area.py`: 面積 `<= 0` で `ValueError`

### GeoJSON ホール処理

RFC 7946 §3.1.6 に従い `_polygon_area_km2(rings)` でホール（内側リング）を差し引く
実装とした．現在の `hokkaido.geojson` にはホールが 0 件だが，
将来のデータ更新（ダム湖・湖沼を含む境界変更等）に備えた対応である．

## 代替案と棄却理由

| 案 | 棄却理由 |
|---|---|
| 面積 CSV を別途用意して公式値を使う | ファイルが増える・更新の手間が増える |
| `MUNICIPALITIES` に area カラムを残す | データとコードの混在が続く |
| 札幌ふるさと納税を 10 行（区別）で CSV 管理 | 按分ロジックが CSV 外に漏れる・合計不一致リスク |

## 市区町村コードのズレ修正（01232-01236）

Phase 13 着手時に，系統的なズレが発覚した．

| 自治体 | 旧コード（誤） | 正コード |
|---|---|---|
| 北広島市 | 01233 | 01234 |
| 石狩市 | 01234 | 01235 |
| 北斗市 | 01235 | 01236 |
| 伊達市 | 01232 | 01233 |

総務省「全国の地方公共団体コード」（2024 年 6 月 26 日現在）で確認済み．

## 参照

- PR #50: feat(etl): 市区町村データを ETL スクリプト群に分離する（Phase 13）
- 総務省コード一覧: https://www.eltax.lta.go.jp/documents/10705
- RFC 7946 §3.1.6（GeoJSON Polygon holes）: https://www.rfc-editor.org/rfc/rfc7946#section-3.1.6
