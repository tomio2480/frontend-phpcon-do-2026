"""build_municipalities.py のテスト"""
import pytest

SAPPORO_WARD_CODES = {f"011{i:02d}" for i in range(1, 11)}
TOTAL_ENTRIES = 188


@pytest.fixture(scope="module")
def built():
    import build_municipalities
    return build_municipalities.build()


@pytest.fixture(scope="module")
def muni_dict(built):
    return built[0]


@pytest.fixture(scope="module")
def total_dict(built):
    return built[1]


def test_build_returns_two_dicts(built):
    assert isinstance(built, tuple) and len(built) == 2
    assert isinstance(built[0], dict)
    assert isinstance(built[1], dict)


def test_municipalities_count(muni_dict):
    assert len(muni_dict) == TOTAL_ENTRIES


def test_no_duplicate_codes(muni_dict):
    # dict のキーは一意なので重複は起きないが，元データの確認として
    assert len(muni_dict) == len(set(muni_dict.keys()))


def test_sapporo_wards_present(muni_dict):
    for code in SAPPORO_WARD_CODES:
        assert code in muni_dict, f"札幌区コード {code} が存在しない"


def test_required_fields(muni_dict):
    required = {"code", "name", "display_name", "region", "area", "population",
                "furusato_amount", "furusato_count"}
    for code, entry in muni_dict.items():
        missing = required - entry.keys()
        assert not missing, f"{code} にフィールド {missing} が存在しない"


def test_area_positive(muni_dict):
    for code, entry in muni_dict.items():
        assert entry["area"] > 0, f"{code} の面積が 0 以下"


def test_population_positive(muni_dict):
    for code, entry in muni_dict.items():
        assert entry["population"] > 0, f"{code} の人口が 0 以下"


def test_total_population_matches(muni_dict, total_dict):
    expected = sum(m["population"] for m in muni_dict.values())
    assert total_dict["population"] == expected


def test_total_furusato_amount_matches(muni_dict, total_dict):
    expected = sum(m["furusato_amount"] for m in muni_dict.values())
    assert total_dict["furusato_amount"] == expected


def test_total_furusato_count_matches(muni_dict, total_dict):
    expected = sum(m["furusato_count"] for m in muni_dict.values())
    assert total_dict["furusato_count"] == expected


def test_sapporo_furusato_sum(muni_dict):
    """札幌10区のふるさと納税合計が市全体の設定値と一致する"""
    total_amount = sum(muni_dict[c]["furusato_amount"] for c in SAPPORO_WARD_CODES)
    total_count = sum(muni_dict[c]["furusato_count"] for c in SAPPORO_WARD_CODES)
    import build_municipalities
    assert total_amount == build_municipalities.SAPPORO_FURUSATO_AMOUNT
    assert total_count == build_municipalities.SAPPORO_FURUSATO_COUNT
