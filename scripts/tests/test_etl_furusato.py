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


def test_raises_on_missing_ward_population(tmp_path):
    """population に区コードが欠けている場合は ValueError を送出する"""
    csv_file = tmp_path / "furusato.csv"
    csv_file.write_text(
        f"code,amount,count\n01100,{SAPPORO_AMOUNT_TOTAL},{SAPPORO_COUNT_TOTAL}\n",
        encoding="utf-8",
    )
    incomplete_pop = {"01101": 255_288}  # 残りの区コードが欠損
    import etl_furusato
    with pytest.raises(ValueError, match="01102"):
        etl_furusato.load(csv_file, population=incomplete_pop)


def test_raises_on_negative_amount(tmp_path):
    csv_file = tmp_path / "furusato.csv"
    csv_file.write_text("code,amount,count\n01202,-1,50\n", encoding="utf-8")
    import etl_furusato
    with pytest.raises(ValueError, match="01202"):
        etl_furusato.load(csv_file, population=None)


def test_raises_on_negative_count(tmp_path):
    csv_file = tmp_path / "furusato.csv"
    csv_file.write_text("code,amount,count\n01202,1000000,-1\n", encoding="utf-8")
    import etl_furusato
    with pytest.raises(ValueError, match="01202"):
        etl_furusato.load(csv_file, population=None)


def test_zero_amount_and_count_accepted(tmp_path):
    """受入実績がない自治体は amount=0, count=0 を許容する"""
    csv_file = tmp_path / "furusato.csv"
    csv_file.write_text("code,amount,count\n01202,0,0\n", encoding="utf-8")
    import etl_furusato
    data = etl_furusato.load(csv_file, population=None)
    assert data == {"01202": (0, 0)}
