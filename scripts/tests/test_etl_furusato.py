"""etl_furusato.py のテスト"""
import pathlib
import pytest

DATA_PATH = pathlib.Path(__file__).parent.parent / "data" / "furusato.csv"
POP_PATH = pathlib.Path(__file__).parent.parent / "data" / "population.csv"

# 札幌市のコードと10区のコード
SAPPORO_CITY_CODE = "01100"
SAPPORO_WARD_CODES = {f"011{i:02d}" for i in range(1, 11)}

# CSV に記載された札幌市の合計（現況調査値）
SAPPORO_AMOUNT_TOTAL = 3_904_088_764
SAPPORO_COUNT_TOTAL = 208_028


@pytest.fixture(scope="module")
def population():
    import etl_population
    return etl_population.load(POP_PATH)


@pytest.fixture(scope="module")
def furusato_data(population):
    import etl_furusato
    return etl_furusato.load(DATA_PATH, population=population)


def test_returns_dict(furusato_data):
    assert isinstance(furusato_data, dict)


def test_values_are_int_tuples(furusato_data):
    for code, val in furusato_data.items():
        assert isinstance(val, tuple) and len(val) == 2, f"{code} が (int, int) でない"
        amount, count = val
        assert isinstance(amount, int), f"{code} の amount が int でない"
        assert isinstance(count, int), f"{code} の count が int でない"


def test_sapporo_city_code_not_in_result(furusato_data):
    assert SAPPORO_CITY_CODE not in furusato_data, "01100（市全体）が結果に残っている"


def test_sapporo_wards_present(furusato_data):
    for code in SAPPORO_WARD_CODES:
        assert code in furusato_data, f"札幌区コード {code} が存在しない"


def test_sapporo_ward_totals_match_city_total(furusato_data):
    total_amount = sum(furusato_data[c][0] for c in SAPPORO_WARD_CODES)
    total_count = sum(furusato_data[c][1] for c in SAPPORO_WARD_CODES)
    assert total_amount == SAPPORO_AMOUNT_TOTAL
    assert total_count == SAPPORO_COUNT_TOTAL


def test_expected_entry_count(furusato_data):
    # 188 市区町村（01100 を除き 10 区を展開した結果）
    assert len(furusato_data) == 188


def test_known_values(furusato_data):
    # 函館市
    assert furusato_data["01202"] == (2_222_260_040, 104_180)
    # 帯広市
    assert furusato_data["01207"] == (1_138_555_984, 71_452)


def test_load_without_sapporo_city(tmp_path):
    """01100 が CSV に含まれない場合は distribution をスキップして返す"""
    csv_file = tmp_path / "furusato.csv"
    csv_file.write_text(
        "code,amount,count\n01202,1000000,50\n01207,2000000,100\n",
        encoding="utf-8",
    )
    import etl_furusato
    data = etl_furusato.load(csv_file, population=None)
    assert data == {"01202": (1_000_000, 50), "01207": (2_000_000, 100)}
