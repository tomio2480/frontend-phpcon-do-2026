# 北海道の行政区域 GeoJSON 生成の知見

国土数値情報 N03（行政区域データ）から北海道の市区町村 GeoJSON を生成した際の判断・詰まり箇所・レビューで得た学びをまとめる．

## 目次

- [背景](#背景)
- [採用した設計判断](#採用した設計判断)
- [詰まった箇所と解決](#詰まった箇所と解決)
- [レビューで得た学び](#レビューで得た学び)
- [参照](#参照)

## 背景

PHP カンファレンス北海道 2026 の会場マップ用に，北海道全 194 市区町村の GeoJSON が必要だった．
国土数値情報の Shapefile を取得・変換するスクリプト `scripts/simplify_geojson.py` を実装した．
成果物は `public/data/hokkaido.geojson` としてコミットした．

## 採用した設計判断

### ZIP を直接 `gpd.read_file` に渡す

当初は `zip://` スキームで URL を組み立てていた．
最終的に `gpd.read_file(cache_zip, encoding="cp932")` へ簡略化した．

geopandas + GDAL は `.zip` ファイルパスを直接渡すと内部的に `/vsizip/` 経由で
Shapefile を自動検出する．`zipfile` モジュールと `find_shp_entry` 関数が不要になった．

### `try...finally` + `success` フラグでダウンロードの堅牢化

`except Exception` は `BaseException` 系の `KeyboardInterrupt` をキャッチできない．
そのため，Ctrl+C 時に `.tmp` ファイルが残留する．
`try...finally` + `success = False` フラグに変更することで，
例外・Ctrl+C いずれの場合でも確実にクリーンアップされる．

また，`Content-Length` が既知のとき `downloaded != total` を検出して `IOError` を送出する．
これにより，不完全な ZIP がキャッシュとして保存されることを防いでいる．

### `coordinate_precision=6` で座標精度を 6 桁に制限

`SIMPLIFY_TOLERANCE = 0.001` 度（約 100 m）で簡略化しているため，
6 桁（約 11 cm）以上の精度は不要．

`gdf_out.to_file(OUTPUT_PATH, driver="GeoJSON", coordinate_precision=6)` で指定する．
pyogrio 0.12.1 は `coordinate_precision` を GDAL の `COORDINATE_PRECISION` へ自動マッピングする．
`layer_options={"COORDINATE_PRECISION": "6"}` の指定は不要．

効果: 3.27 MB → 2.00 MB（約 39% 削減）．

## 詰まった箇所と解決

### N03 データのエンコーディング判定

レビュアーが "2023 年の N03 データは UTF-8" と繰り返し主張したが，
以下の手順で Shift-JIS（cp932）であることを確認した．

1. `.cpg` ファイルが存在しない
2. `.dbf` の言語ドライババイトが `0x00`
3. `encoding="utf-8"` で読み込むと `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x96`

`encoding="cp932"` が正しい．この指摘は全ラウンドで却下した．

### N03_004 の格納値

レビュアーは「政令市の区は N03_004 に `中央区` のみ格納される」と主張した．
実データを確認すると N03_004 = `"札幌市中央区"`（市名を含む完全名称）だった．

提案された `if c.endswith("市"): return c + w` を実装すると
`"札幌市札幌市中央区"` のように市名が二重になる．
現在の実装（N03_004 をそのまま返す）が正しい．

## レビューで得た学び

- **pyogrio の kwargs 自動マッピング**: `write_dataframe` の `**kwargs` は
  ドライバ固有オプションへ自動マッピングされる．
  GDAL オプション名（`COORDINATE_PRECISION`）を lowercase で渡しても動作する．
- **`try...finally` vs `except/raise`**: `KeyboardInterrupt` を考慮するなら
  `try...finally` が汎用的で意図が明確．
- **レビュアーの提案は実データで検証してから採否を判断する**:
  `json.dumps(ensure_ascii=False)` 等で確かめてから採否を決める．
  特に既存データの構造に関する主張ではこの確認を優先する．

## 参照

- PR #17: feat: 北海道の行政区域 GeoJSON を追加（国土数値情報 N03）
- 国土数値情報 N03 ダウンロードページ: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html
- 利用データ: N03-20230101_01_GML.zip（2023 年 1 月 1 日基準）
