"""etl_area.py のテスト"""
import pathlib
import pytest

GEOJSON_PATH = pathlib.Path(__file__).parent.parent.parent / "public" / "data" / "hokkaido.geojson"

# 北方領土を含むすべてのコードを集計対象とするため除外コードなし
_HOPPO_CODES = {"01695", "01696", "01697", "01698", "01699", "01700"}

# 期待値: 国土地理院「全国都道府県市区町村別面積調」令和5年10月1日現在
# GeoJSON 由来の面積は簡略化の影響で誤差を含むため ±20% の許容範囲とする
_KNOWN_AREAS = {
    "01101": 46.42,   # 札幌市中央区
    "01202": 677.87,  # 函館市
    "01207": 619.34,  # 帯広市
}
_TOLERANCE = 0.20


@pytest.fixture(scope="module")
def area_data():
    import etl_area
    return etl_area.load(GEOJSON_PATH)


def test_returns_dict(area_data):
    assert isinstance(area_data, dict)


def test_values_are_positive_floats(area_data):
    for code, area in area_data.items():
        assert isinstance(area, float), f"{code} の面積が float でない"
        assert area > 0, f"{code} の面積が 0 以下"


def test_hoppo_codes_present(area_data):
    """北方領土6村が面積集計に含まれている"""
    for code in _HOPPO_CODES:
        assert code in area_data, f"北方領土コード {code} が含まれていない"
        assert area_data[code] > 0, f"北方領土コード {code} の面積が 0 以下"


def test_expected_entry_count(area_data):
    # GeoJSON の 194 フィーチャをすべて含む
    assert len(area_data) == 194


def test_known_area_within_tolerance(area_data):
    for code, expected in _KNOWN_AREAS.items():
        assert code in area_data, f"コード {code} が存在しない"
        actual = area_data[code]
        assert abs(actual - expected) / expected <= _TOLERANCE, (
            f"{code}: expected {expected:.2f} km², got {actual:.2f} km²"
        )


def test_polygon_with_hole_subtracts_inner_ring(tmp_path):
    """ホールを持つ Polygon はホール面積を差し引く"""
    import json, etl_area
    # 10km x 10km の正方形に 2km x 2km の穴
    outer = [[0, 0], [0.0899, 0], [0.0899, 0.0899], [0, 0.0899], [0, 0]]
    inner = [[0.01, 0.01], [0.028, 0.01], [0.028, 0.028], [0.01, 0.028], [0.01, 0.01]]
    gj = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"code": "99001"},
                "geometry": {"type": "Polygon", "coordinates": [outer, inner]},
            }
        ],
    }
    path = tmp_path / "test.geojson"
    path.write_text(json.dumps(gj), encoding="utf-8")
    result = etl_area.load(path)
    assert "99001" in result
    area_without_hole = etl_area._ring_area_km2(outer)
    area_of_hole = etl_area._ring_area_km2(inner)
    expected = round(area_without_hole - area_of_hole, 2)
    assert result["99001"] == expected


def test_raises_on_zero_or_negative_area(tmp_path):
    """面積が 0 以下のフィーチャは ValueError を送出する"""
    import json, etl_area
    # 縮退したポリゴン（3点が同一線上）
    degenerate = [[0, 0], [0.001, 0], [0.002, 0], [0, 0]]
    gj = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"code": "99002"},
                "geometry": {"type": "Polygon", "coordinates": [degenerate]},
            }
        ],
    }
    path = tmp_path / "degenerate.geojson"
    path.write_text(json.dumps(gj), encoding="utf-8")
    with pytest.raises(ValueError, match="99002"):
        etl_area.load(path)
