"""
北海道行政区域 GeoJSON 簡略化スクリプト

■ 概要
国土数値情報「行政区域データ」から取得した Shapefile を
GeoJSON に変換し、mapshaper で座標精度を 5〜10% に簡略化して
public/data/hokkaido.geojson を生成する。

■ 前提ツール
- Python 3.10 以上
- geopandas (pip install geopandas)
- mapshaper (npm install -g mapshaper)
  ※ mapshaper が使用できない場合は shapely の simplify を使用する

■ 入力データの取得手順
1. 国土数値情報ダウンロードサービスにアクセスする
   https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2024.html
2. 北海道（01）の最新年度データ（Shapefile）をダウンロードする
3. ダウンロードした ZIP を解凍し、ディレクトリパスを INPUT_SHAPEFILE に設定する

■ 実行方法
  python scripts/simplify_geojson.py --input /path/to/N03-24_01_240101.shp
  python scripts/simplify_geojson.py --input /path/to/N03-24_01_240101.shp --method mapshaper

■ 出力
  public/data/hokkaido.geojson
  （座標精度 10%、市区町村コード付き）

■ GeoJSON スキーマ
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "MultiPolygon", ... },
      "properties": {
        "code": "01101",        // 全国地方公共団体コード5桁
        "name": "中央区",
        "display_name": "札幌市 中央区"
      }
    }
  ]
}
"""

from __future__ import annotations
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

OUTPUT_PATH = pathlib.Path(__file__).parent.parent / "public" / "data" / "hokkaido.geojson"

# 国土数値情報 行政区域データの属性名（N03 フォーマット）
# N03_001: 都道府県名
# N03_002: 支庁・振興局名
# N03_003: 郡・政令指定都市名（札幌市の区では "札幌市"）
# N03_004: 市区町村名（政令市の場合は区名）
# N03_007: 市区町村コード（6桁、チェックディジット付き）
ATTR_CODE       = "N03_007"
ATTR_PREF       = "N03_001"
ATTR_OFFICE     = "N03_003"
ATTR_CITY       = "N03_004"


def _to_5digit(code6: str | None) -> str | None:
    """6桁コードを5桁コードに変換する（末尾チェックディジットを除去）。"""
    if not isinstance(code6, str) or len(code6) != 6:
        return None
    return code6[:5]


def _preprocess_gdf(input_path: str, encoding: str | None = None):
    """Shapefile を読み込み、北海道市区町村 GeoDataFrame として前処理する。

    encoding: Shapefile の文字コード。None の場合は .cpg ファイルで自動判別。
    国土数値情報の旧形式（.cpg なし）では "cp932" を明示的に指定すること。
    戻り値は code / name / display_name / geometry 列のみを持つ dissolve 済み GDF。
    """
    try:
        import geopandas as gpd
    except ImportError:
        print("ERROR: geopandas が見つかりません。pip install geopandas を実行してください。")
        sys.exit(1)

    print(f"Reading shapefile: {input_path}")
    read_kwargs: dict = {"filename": input_path}
    if encoding:
        read_kwargs["encoding"] = encoding
    gdf = gpd.read_file(**read_kwargs)

    # .prj ファイルが欠落している場合など CRS が未定義のケースに対応する
    # N03 データの標準 CRS は JGD2011 地理座標系（EPSG:6668）
    if gdf.crs is None:
        print("  WARNING: CRS が未定義です。EPSG:6668 (JGD2011) を仮定します。")
        gdf = gdf.set_crs("EPSG:6668")

    # 必要なカラムの存在チェック（誤ったフォーマットのファイルを早期検出する）
    required_cols = [ATTR_PREF, ATTR_CODE, ATTR_OFFICE, ATTR_CITY]
    missing = [c for c in required_cols if c not in gdf.columns]
    if missing:
        print(f"ERROR: 必要なカラムが見つかりません: {missing}")
        print(f"  利用可能なカラム: {list(gdf.columns)}")
        sys.exit(1)

    # 北海道のみを抽出
    gdf = gdf[gdf[ATTR_PREF] == "北海道"].copy()
    if gdf.empty:
        print(f"ERROR: 北海道のデータが見つかりません（{ATTR_PREF} == '北海道' の行がありません）。")
        sys.exit(1)
    print(f"  Features (before dissolve): {len(gdf)}")

    # コードを5桁に変換
    gdf["code"] = gdf[ATTR_CODE].apply(_to_5digit)
    gdf = gdf.dropna(subset=["code"])

    # NaN を空文字に置換してから name / display_name を生成（ディゾルブ前に確定させる）
    # 政令指定都市の区（N03_003 が市名）は「{市名} {区名}」に結合
    gdf[ATTR_OFFICE] = gdf[ATTR_OFFICE].fillna("")
    gdf[ATTR_CITY]   = gdf[ATTR_CITY].fillna("")
    gdf["name"] = gdf[ATTR_CITY]
    gdf["display_name"] = gdf.apply(
        lambda r: f"{r[ATTR_OFFICE]} {r[ATTR_CITY]}"
        if r[ATTR_OFFICE].endswith("市") and r[ATTR_CITY].endswith("区")
        else r[ATTR_CITY],
        axis=1,
    )

    # 市区町村コードでディゾルブ（小ポリゴンを統合）
    # aggfunc="first" を明示してバージョン間の挙動変化を防止
    dissolved = gdf.dissolve(by="code", aggfunc="first", as_index=False)[
        ["code", "name", "display_name", "geometry"]
    ]
    print(f"  Features (after dissolve) : {len(dissolved)}")
    return dissolved


def simplify_with_shapely(input_path: str, tolerance: float = 0.01,
                          encoding: str | None = None) -> None:
    """geopandas + shapely で簡略化して GeoJSON に変換する。

    encoding: Shapefile の文字コード。None の場合は .cpg ファイルで自動判別。
    国土数値情報の旧形式（.cpg なし）では "cp932" を明示的に指定すること。
    """
    dissolved = _preprocess_gdf(input_path, encoding)

    # 北海道に適した投影座標系（UTM Zone 54N）に変換してから簡略化
    # 注意: Shapely の simplify は個別ジオメトリにのみ作用するため、
    # 隣接する市区町村の共有境界のトポロジーは保証されない（スリバー発生の可能性あり）。
    # 共有境界を保持したい場合は --method mapshaper を使用すること。
    dissolved = dissolved.to_crs("EPSG:32654")
    dissolved["geometry"] = dissolved["geometry"].simplify(
        tolerance * 1000,   # tolerance km → m
        preserve_topology=True,
    )
    # simplify 後の自己交差等を修正する
    dissolved["geometry"] = dissolved["geometry"].make_valid()
    dissolved = dissolved.to_crs("EPSG:4326")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    # coordinate_precision=6 で座標精度を小数点以下 6 桁（約 10 cm）に制限してファイルサイズを削減
    dissolved[["code", "name", "display_name", "geometry"]].to_file(
        OUTPUT_PATH, driver="GeoJSON", coordinate_precision=6
    )
    print(f"Generated: {OUTPUT_PATH}")


def simplify_with_mapshaper(input_path: str, percentage: float = 10.0,
                            encoding: str | None = None) -> None:
    """mapshaper CLI で簡略化する（高速・高品質）。

    encoding: Shapefile の文字コード。None の場合は .cpg ファイルで自動判別。
    国土数値情報の旧形式（.cpg なし）では "cp932" を明示的に指定すること。
    """
    dissolved = _preprocess_gdf(input_path, encoding)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_geojson = pathlib.Path(tmpdir) / "hokkaido_raw.geojson"
        dissolved.to_crs("EPSG:4326").to_file(tmp_geojson, driver="GeoJSON")

        # Step 2: mapshaper で簡略化
        # Windows では npm グローバルインストールの mapshaper が .cmd として配置されるため
        # shutil.which でフルパスを解決する。shell=True 時は FileNotFoundError が発生しないため
        # 事前に which の結果を確認して未インストールを検出する。
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        mapshaper_bin = shutil.which("mapshaper")
        if mapshaper_bin is None:
            print("ERROR: mapshaper が見つかりません。npm install -g mapshaper を実行してください。")
            sys.exit(1)
        cmd = [
            mapshaper_bin,
            str(tmp_geojson),
            "-simplify", f"{percentage}%", "keep-shapes",
            "-o", str(OUTPUT_PATH), "format=geojson",
        ]
        print(f"Running: {' '.join(cmd)}")
        # Windows では .cmd ファイルの実行にシェル経由が必要
        use_shell = sys.platform == "win32"
        result = subprocess.run(cmd, capture_output=True, text=True, shell=use_shell)
        if result.returncode != 0:
            print(f"mapshaper error:\n{result.stderr}")
            sys.exit(1)

    print(f"Generated: {OUTPUT_PATH}")
    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"  File size: {size_kb:.1f} KB")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="国土数値情報 Shapefile を簡略化 GeoJSON に変換する"
    )
    parser.add_argument(
        "--input", "-i", required=True,
        help="入力 Shapefile のパス (.shp)",
    )
    parser.add_argument(
        "--method", choices=["shapely", "mapshaper"], default="mapshaper",
        help="簡略化手法（デフォルト: mapshaper）",
    )
    parser.add_argument(
        "--percentage", type=float, default=10.0,
        help="mapshaper の簡略化率 %（デフォルト: 10.0）",
    )
    parser.add_argument(
        "--tolerance", type=float, default=0.5,
        help="shapely の簡略化許容誤差 km（デフォルト: 0.5）",
    )
    parser.add_argument(
        "--encoding", default=None,
        help="Shapefile の文字コード（例: cp932, utf-8）。省略時は .cpg で自動判別",
    )
    args = parser.parse_args()

    if not pathlib.Path(args.input).exists():
        print(f"ERROR: ファイルが見つかりません: {args.input}")
        sys.exit(1)

    if args.method == "mapshaper":
        simplify_with_mapshaper(args.input, percentage=args.percentage,
                                encoding=args.encoding)
    else:
        simplify_with_shapely(args.input, tolerance=args.tolerance,
                              encoding=args.encoding)


if __name__ == "__main__":
    main()
