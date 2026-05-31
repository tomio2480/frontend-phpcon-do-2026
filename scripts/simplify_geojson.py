#!/usr/bin/env python3
"""
国土数値情報「行政区域データ」(N03) の北海道版 Shapefile を取得し，
市区町村単位に溶解・簡略化して public/data/hokkaido.geojson を生成する．

出典: 国土交通省 国土数値情報 行政区域データ
     https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html
ライセンス: 国土数値情報利用規約（政府標準利用規約第 2.0 版 準拠）
基準日: 2023 年 1 月 1 日（令和 5 年）
"""

import zipfile
from pathlib import Path

import geopandas as gpd
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"
CACHE_DIR = BASE_DIR / "scripts" / "cache"
ZIP_FILENAME = "N03-20230101_01_GML.zip"
DOWNLOAD_URL = (
    "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2023/" + ZIP_FILENAME
)
OUTPUT_PATH = PUBLIC_DATA_DIR / "hokkaido.geojson"
SIMPLIFY_TOLERANCE = 0.001  # degrees (WGS84), 約 80〜110 m


def download_zip(url: str, cache_path: Path) -> None:
    if cache_path.exists():
        print(f"キャッシュから読み込み: {cache_path}")
        return

    print(f"ダウンロード中: {url}")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = cache_path.with_suffix(".tmp")
    success = False
    try:
        with requests.get(url, stream=True, timeout=120) as resp:
            resp.raise_for_status()
            total_header = resp.headers.get("content-length")
            total = int(total_header) if total_header and total_header.isdigit() else 0
            downloaded = 0
            with tmp_path.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        mb_done = downloaded / 1024 / 1024
                        mb_total = total / 1024 / 1024
                        print(f"\r  {pct:.1f}%  ({mb_done:.1f} / {mb_total:.1f} MB)", end="", flush=True)
        print()
        if total and downloaded != total:
            raise IOError(f"ダウンロードが不完全です: {downloaded}/{total} バイト")
        tmp_path.replace(cache_path)
        print(f"キャッシュ保存: {cache_path}")
        success = True
    finally:
        if not success and tmp_path.exists():
            tmp_path.unlink()


def find_shp_entry(zf: zipfile.ZipFile) -> str:
    for name in zf.namelist():
        if (name.endswith(".shp")
                and not Path(name).name.startswith("._")
                and "__MACOSX" not in name):
            return name
    raise FileNotFoundError("ZIP 内に .shp ファイルが見つかりません")


def build_name(city, ward) -> str:
    c = city.strip() if isinstance(city, str) else ""
    w = ward.strip() if isinstance(ward, str) else ""
    if not w:
        return c
    if c == w:
        return c
    # N03_004 には政令市の区も「札幌市中央区」のように完全な名称が格納される．
    # 郡名（N03_003）は省略し，N03_004 の市区町村名をそのまま返す．
    return w


def main() -> None:
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    cache_zip = CACHE_DIR / ZIP_FILENAME
    download_zip(DOWNLOAD_URL, cache_zip)

    with zipfile.ZipFile(cache_zip) as zf:
        shp_entry = find_shp_entry(zf)

    zip_url = f"zip://{cache_zip.resolve().as_posix()}!{shp_entry}"
    print(f"Shapefile を読み込み中: {shp_entry}")
    gdf = gpd.read_file(zip_url, encoding="cp932")
    print(f"  {len(gdf)} フィーチャー, CRS={gdf.crs}")

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=6668)  # N03 データの既知 CRS: JGD2011
    if gdf.crs.to_epsg() != 4326:
        print("WGS84 (EPSG:4326) へ変換中...")
        gdf = gdf.to_crs(epsg=4326)

    # 行政区域コードが存在しない行（海・湖等の非自治体域）を除外
    mask = gdf["N03_007"].notna() & (gdf["N03_007"].str.strip() != "")
    gdf = gdf[mask].copy()
    print(f"  自治体レコードのみ: {len(gdf)} フィーチャー")

    # 市区町村コード単位で溶解（飛び地・島嶼の統合）
    print("市区町村単位で溶解中...")
    gdf_dissolved = gdf.dissolve(by="N03_007", aggfunc="first").reset_index()
    print(f"  溶解後: {len(gdf_dissolved)} 市区町村")

    # 出力プロパティを整形
    gdf_dissolved["code"] = gdf_dissolved["N03_007"].str.strip()
    gdf_dissolved["name"] = gdf_dissolved.apply(
        lambda r: build_name(r["N03_003"], r["N03_004"]), axis=1
    )
    gdf_dissolved["city"] = gdf_dissolved["N03_003"].fillna("").str.strip()
    gdf_dissolved["subprefecture"] = gdf_dissolved["N03_002"].fillna("").str.strip()
    gdf_out = gdf_dissolved[["code", "name", "city", "subprefecture", "geometry"]].copy()

    print(f"ジオメトリを簡略化中 (tolerance={SIMPLIFY_TOLERANCE} deg)...")
    gdf_out["geometry"] = gdf_out["geometry"].simplify(
        SIMPLIFY_TOLERANCE, preserve_topology=True
    )
    # make_valid() で自己交差等の無効ジオメトリを修正
    gdf_out["geometry"] = gdf_out["geometry"].make_valid()

    print(f"GeoJSON を書き出し中: {OUTPUT_PATH}")
    gdf_out.to_file(OUTPUT_PATH, driver="GeoJSON", coordinate_precision=6)

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(
        f"完了: {len(gdf_out)} 市区町村, "
        f"{size_kb:.0f} KB ({size_kb / 1024:.2f} MB)"
    )


if __name__ == "__main__":
    main()
