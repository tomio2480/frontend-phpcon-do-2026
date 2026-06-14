"""etl_population.py のテスト"""
import csv
import io
import pathlib
import pytest

DATA_PATH = pathlib.Path(__file__).parent.parent / "data" / "population.csv"


@pytest.fixture(scope="module")
def pop_data():
    import etl_population
    return etl_population.load(DATA_PATH)


def test_returns_dict(pop_data):
    assert isinstance(pop_data, dict)


def test_values_are_positive_ints(pop_data):
    for code, pop in pop_data.items():
        assert isinstance(pop, int), f"{code} の人口が int でない"
        assert pop > 0, f"{code} の人口が 0 以下"


def test_expected_entry_count(pop_data):
    # 188 市区町村（札幌10区 + 他178）
    assert len(pop_data) == 188


def test_sapporo_wards_present(pop_data):
    for i in range(1, 11):
        code = f"011{i:02d}"
        assert code in pop_data, f"札幌市の区コード {code} が存在しない"


def test_known_populations(pop_data):
    assert pop_data["01101"] == 255_288   # 札幌市中央区
    assert pop_data["01202"] == 232_050   # 函館市
    assert pop_data["01207"] == 160_431   # 帯広市


def test_loads_from_custom_path(tmp_path):
    csv_file = tmp_path / "pop.csv"
    csv_file.write_text("code,population\n01101,12345\n01202,67890\n", encoding="utf-8")
    import etl_population
    data = etl_population.load(csv_file)
    assert data == {"01101": 12345, "01202": 67890}


def test_raises_on_zero_population(tmp_path):
    csv_file = tmp_path / "pop.csv"
    csv_file.write_text("code,population\n01101,0\n", encoding="utf-8")
    import etl_population
    with pytest.raises(ValueError, match="01101"):
        etl_population.load(csv_file)


def test_raises_on_negative_population(tmp_path):
    csv_file = tmp_path / "pop.csv"
    csv_file.write_text("code,population\n01202,-100\n", encoding="utf-8")
    import etl_population
    with pytest.raises(ValueError, match="01202"):
        etl_population.load(csv_file)
