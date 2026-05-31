#!/usr/bin/env python3
"""
国土数値情報「行政区域データ」(N03) の北海道版 Shapefile を取得し，
市区町村単位に溶解・簡略化して public/data/hokkaido.geojson を生成する．

出典: 国土交通省 国土数値情報 行政区域データ
     https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html
ライセンス: 国土数値情報利用規約（政府標準利用規約第 2.0 版 準拠）
基準日: 2023 年 1 月 1 日（令和 5 年）
"""

import io
import sys
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


def download_zip(url: str, cache_path: Path) -> bytes:
    if cache_path.exists():
        print(f"キャッシュから読み込み: {cache_path}")
        return cache_path.read_bytes()

    print(f"ダウンロード中: {url}")
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        chunks: list[bytes] = []
        downloaded = 0
        for chunk in resp.iter_content(chunk_size=65536):
            chunks.append(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded / total * 100
                mb_done = downloaded / 1024 / 1024
                mb_total = total / 1024 / 1024
                print(f"\r  {pct:.1f}%  ({mb_done:.1f} / {mb_total:.1f} MB)", end="", flush=True)

    print()
    data = b"".join(chunks)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_bytes(data)
    print(f"キャッシュ保存: {cache_path}")
    return data


def find_shp_entry(zf: zipfile.ZipFile) -> str:
    for name in zf.namelist():
        if name.endswith(".shp"):
            return name
    raise FileNotFoundError("ZIP 内に .shp ファイルが見つかりません")


def build_name(city, ward) -> str:
    c = city.strip() if isinstance(city, str) else ""
    w = ward.strip() if isinstance(ward, str) else ""
    if c == w:
        return c
    # 郡名（〜郡 で終わる場合）は省略し，市区町村名のみ返す
    return w if w else c


def main() -> None:
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    cache_zip = CACHE_DIR / ZIP_FILENAME
    zip_bytes = download_zip(DOWNLOAD_URL, cache_zip)

    extract_dir = CACHE_DIR / "extracted"
    extract_dir.mkdir(parents=True, exist_ok=True)

    print("Shapefile を展開中...")
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        shp_entry = find_shp_entry(zf)
        zf.extractall(extract_dir)

    shp_path = extract_dir / shp_entry
    print(f"Shapefile を読み込み中: {shp_path.name}")
    gdf = gpd.read_file(shp_path, encoding="cp932")
    print(f"  {len(gdf)} フィーチャー, CRS={gdf.crs}")

    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
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
    # buffer(0) で自己交差等の無効ジオメトリを修正
    gdf_out["geometry"] = gdf_out["geometry"].buffer(0)

    print(f"GeoJSON を書き出し中: {OUTPUT_PATH}")
    gdf_out.to_file(OUTPUT_PATH, driver="GeoJSON")

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(
        f"完了: {len(gdf_out)} 市区町村, "
        f"{size_kb:.0f} KB ({size_kb / 1024:.2f} MB)"
    )


if __name__ == "__main__":
    main()
