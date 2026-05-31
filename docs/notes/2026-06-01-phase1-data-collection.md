# Phase 1 データ収集・整形で得た知見

## 背景

北海道 188 市区町村の面積・人口・ふるさと納税データを JSON に整形し，
地図表示用 GeoJSON を生成するスクリプトを実装した（PR #19）．
Gemini レビューを 7 ラウンド経て得た学びと設計判断を記録する．

## 判断

### simplify_geojson.py のコンフリクト解消

`phase/1-data-collection` と `origin/main` が独立して同名ファイルを追加したため，
マージ時にコンフリクトが発生した．

- `origin/main` 版: 自動ダウンロード型・6 桁コード・`city`/`subprefecture` プロパティ
- `phase/1` 版: 引数指定型・5 桁コード・`display_name` プロパティ・Gemini 7 ラウンド済み

`municipalities.json` のキーが 5 桁コードであり，将来の地図表示で GeoJSON と照合する必要があるため，
`--ours`（`phase/1` 版）を採用した．
`origin/main` 版は `docs/geojson-data-notes` ブランチでの先行実験として位置付け，
Phase 1 版に取って代わられた．

### 札幌市ふるさと納税の端数処理

10 区への人口比按分で `round()` を使うと最後の区で 1 円の誤差が出る．
最後の区のみ「合計目標値 − 累積済み額」で確定する方式（ラストマン補正）を採用した．
これにより合計値が常に元の総額と一致する．

### 5 桁コード変換の実装

国土数値情報 N03 の `N03_007` は 6 桁（末尾がチェックディジット）．
`isinstance(code6, str)` で型チェックしてから `code6[:5]` で切り出す．
`NaN`（float 型）が来た場合に `len()` で `TypeError` が発生する実績があるため，
`not code6` 判定ではなく `isinstance` が正しい．

## 詰まった箇所

### Windows の subprocess で FileNotFoundError が発生しない

`shell=True` で `subprocess.run` を呼ぶと，コマンドが存在しなくても
`FileNotFoundError` は発生せず，シェルがエラーメッセージを出力して
非ゼロのリターンコードを返す．`except FileNotFoundError` が空振りになる．

**対策**: `shutil.which()` で事前にコマンドの有無を確認し，
`None` の場合はその場で `sys.exit(1)` する．
`try-except FileNotFoundError` ブロックは不要になる．

### Windows で mapshaper が実行できない

npm でグローバルインストールした `mapshaper` は Windows では
`mapshaper.cmd` というバッチファイルとして配置される．
`shell=False`（デフォルト）でこのパスを指定すると実行できない．

**対策**: `shell = sys.platform == "win32"` で Windows 判定し，
`subprocess.run` に渡す．さらに `shutil.which("mapshaper")` で
`.cmd` フルパスを解決してから `cmd` リストに格納する．

### geopandas: CRS が None のケース

`.prj` ファイルが欠落または破損した Shapefile を読み込むと `gdf.crs` が `None` になり，
後続の `to_crs()` で `ValueError: Cannot transform naive geometries.` が発生する．

**対策**: `read_file()` 直後に `gdf.crs is None` を確認し，
N03 データの標準 CRS である EPSG:6668（JGD2011 地理座標系）を
`set_crs("EPSG:6668")` でフォールバック設定する．

## レビューで学んだこと

### math.fsum による浮動小数点累積誤差の抑制

`total_area += area` をループで 188 回繰り返すと丸め誤差が蓄積する．
`math.fsum(m["area"] for m in vals)` を使うと補正付き総和が計算される（Kahan 補償算法）．
整数値（`population` 等）は `sum` で問題ない．

また，合計値の計算はループと分離して `dict.values()` から宣言的に行うことで，
`for` ループの責務が「辞書の構築」のみに限定され，可読性が上がる．

### coordinate_precision=6 で GeoJSON のサイズを削減

geopandas の `to_file()` はデフォルトで座標を 15 桁前後の浮動小数点で出力する．
`coordinate_precision=6` を指定すると小数点以下 6 桁（約 10 cm の精度）に丸められ，
ファイルサイズを大幅に削減できる．

### make_valid() で簡略化後の無効ジオメトリを修正

`shapely.simplify()` は個別ポリゴンに作用するため，隣接市区町村との共有境界のトポロジーを保証しない．
簡略化の結果として自己交差（self-intersection）が生じることがある．
`make_valid()` を挟むことでフロントエンドや GIS ツールでの描画バグを防ぐ．

### aggfunc="first" を dissolve に明示する

`gdf.dissolve(by="code")` は将来の geopandas バージョンで
非数値カラムの集計方法についての `FutureWarning` を出す可能性がある．
`aggfunc="first"` を明示することでバージョン間の挙動差を封じる．

### shutil.which で mapshaper の存在チェックを一元化

`shutil.which("mapshaper") or "mapshaper"` という記述は，
`which` が `None` を返した場合でも `"mapshaper"` フォールバックを渡してしまい，
本来検出したかった「未インストール」を隠蔽する．

`mapshaper_bin = shutil.which("mapshaper")` の後に
`if mapshaper_bin is None: sys.exit(1)` を明示するパターンが正しい．

## 代替案と棄却理由

### NamedTuple による MUNICIPALITIES 型定義

Gemini から 7 ラウンドを通じて `NamedTuple` への移行提案を受けた．
属性名アクセスによる可読性向上の効果は認めるが，
188 件のデータ行すべてに `Municipality(...)` コンストラクタを追加する必要があり，
変更量に対する実益が小さいと判断して見送った．
データ行の大規模変更が必要になった際に合わせて導入する．

### 自動ダウンロード版スクリプト（origin/main 版）

`requests` でシェープファイルを自動ダウンロードし，キャッシュ管理する機構を持つ．
便利だが，引数指定版と比べてエラー処理・エンコード制御・簡略化手法の選択性が劣る．
Phase 6 以降で地図タイルを再生成する際は，改良した自動版の再検討を推奨する．

## 参照

- PR #19: Phase 1 - データ収集・整形
- 総務省 全国地方公共団体コード（2024 年 6 月 26 日現在）
- 国土数値情報 行政区域データ N03: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2024.html
- Python math.fsum ドキュメント: https://docs.python.org/ja/3/library/math.html#math.fsum
