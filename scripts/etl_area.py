"""面積 ETL: hokkaido.geojson ジオメトリから市区町村別面積を計算する。"""
from __future__ import annotations
import json
import math
import pathlib

GEOJSON_PATH = pathlib.Path(__file__).parent.parent / "public" / "data" / "hokkaido.geojson"

# 北方領土の市区町村コード（集計対象外）
_EXCLUDED_CODES = {"01695", "01696", "01697", "01698", "01699", "01700"}


def _ring_area_km2(ring: list[list[float]]) -> float:
    """GeoJSON リング（座標リスト）の面積を km² で返す。

    中心緯度でローカル投影し，Shoelace 公式で面積を計算する。
    北海道の緯度範囲（約 41°N〜45°N）では ±1% 程度の誤差。
    """
    n = len(ring)
    if n < 3:
        return 0.0

    lats = [c[1] for c in ring]
    lons = [c[0] for c in ring]
    center_lat = (max(lats) + min(lats)) / 2

    km_per_lat = 111.32
    km_per_lon = 111.32 * math.cos(math.radians(center_lat))

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        xi = lons[i] * km_per_lon
        yi = lats[i] * km_per_lat
        xj = lons[j] * km_per_lon
        yj = lats[j] * km_per_lat
        area += xi * yj - xj * yi

    return abs(area) / 2.0


def _polygon_area_km2(rings: list[list[list[float]]]) -> float:
    """GeoJSON Polygon の rings から面積を返す。

    rings[0] が外側リング，rings[1:] がホール（内側リング）。
    RFC 7946 §3.1.6 に従いホール面積を差し引く。
    """
    area = _ring_area_km2(rings[0])
    for hole in rings[1:]:
        area -= _ring_area_km2(hole)
    return area


def _geometry_area_km2(geometry: dict) -> float:
    """GeoJSON Geometry オブジェクトの面積を km² で返す。"""
    gtype = geometry["type"]
    coords = geometry["coordinates"]

    if gtype == "Polygon":
        return _polygon_area_km2(coords)
    if gtype == "MultiPolygon":
        return sum(_polygon_area_km2(poly) for poly in coords)
    raise ValueError(f"Unsupported geometry type: {gtype}")


def load(geojson_path: pathlib.Path = GEOJSON_PATH) -> dict[str, float]:
    """GeoJSON から市区町村コード → 面積 (km²) の辞書を返す。"""
    with open(geojson_path, encoding="utf-8") as f:
        gj = json.load(f)

    result: dict[str, float] = {}
    for feature in gj["features"]:
        code = feature["properties"]["code"]
        if code in _EXCLUDED_CODES:
            continue
        area = round(_geometry_area_km2(feature["geometry"]), 2)
        if area <= 0:
            raise ValueError(
                f"面積が 0 以下のフィーチャが検出されました: code={code}, area={area}"
            )
        result[code] = area

    return result
