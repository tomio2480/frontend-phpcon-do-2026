"""ふるさと納税 ETL: furusato.csv から市区町村別納税額を読み込む。"""
from __future__ import annotations
import csv
import pathlib

DATA_PATH = pathlib.Path(__file__).parent / "data" / "furusato.csv"

# 札幌市の市全体コード（10区に人口比で按分する）
_SAPPORO_CITY_CODE = "01100"
_SAPPORO_WARD_CODES = tuple(f"011{i:02d}" for i in range(1, 11))


def load(
    path: pathlib.Path = DATA_PATH,
    population: dict[str, int] | None = None,
) -> dict[str, tuple[int, int]]:
    """CSV から市区町村コード → (amount, count) の辞書を返す。

    CSV に 01100（札幌市全体）が含まれる場合，population を使って
    10区に人口比で按分する。population が None の場合は按分をスキップする。
    """
    raw: dict[str, tuple[int, int]] = {}
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw[row["code"]] = (int(row["amount"]), int(row["count"]))

    if _SAPPORO_CITY_CODE not in raw:
        return raw

    if population is None:
        return raw

    sapporo_amount, sapporo_count = raw.pop(_SAPPORO_CITY_CODE)
    ward_pops = {code: population[code] for code in _SAPPORO_WARD_CODES if code in population}
    total_pop = sum(ward_pops.values())

    accumulated_amount = 0
    accumulated_count = 0
    ward_codes = sorted(ward_pops.keys())

    for i, code in enumerate(ward_codes):
        ratio = ward_pops[code] / total_pop
        if i < len(ward_codes) - 1:
            amount = round(sapporo_amount * ratio)
            count = round(sapporo_count * ratio)
        else:
            # 最後の区で端数を調整して合計を目標値に一致させる
            amount = sapporo_amount - accumulated_amount
            count = sapporo_count - accumulated_count
        accumulated_amount += amount
        accumulated_count += count
        raw[code] = (amount, count)

    return raw
