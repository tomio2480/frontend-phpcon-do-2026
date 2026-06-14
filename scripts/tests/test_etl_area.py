"""etl_area.py のテスト"""
import pathlib
import pytest

GEOJSON_PATH = pathlib.Path(__file__).parent.parent.parent / "public" / "data" / "hokkaido.geojson"

_EXCLUDED_CODES = {"01695", "01696", "01697", "01698", "01699", "01700"}

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


def test_excluded_codes_not_present(area_data):
    for code in _EXCLUDED_CODES:
        assert code not in area_data, f"除外コード {code} が含まれている"


def test_expected_entry_count(area_data):
    # GeoJSON の 194 フィーチャから北方領土 6 件を除いた 188 件
    assert len(area_data) == 188


def test_known_area_within_tolerance(area_data):
    for code, expected in _KNOWN_AREAS.items():
        assert code in area_data, f"コード {code} が存在しない"
        actual = area_data[code]
        assert abs(actual - expected) / expected <= _TOLERANCE, (
            f"{code}: expected {expected:.2f} km², got {actual:.2f} km²"
        )
