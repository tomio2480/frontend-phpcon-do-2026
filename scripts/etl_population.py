"""人口 ETL: population.csv から市区町村別人口を読み込む。"""
from __future__ import annotations
import csv
import pathlib

DATA_PATH = pathlib.Path(__file__).parent / "data" / "population.csv"


def load(path: pathlib.Path = DATA_PATH) -> dict[str, int]:
    """CSV から市区町村コード → 人口の辞書を返す。"""
    result: dict[str, int] = {}
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            result[row["code"]] = int(row["population"])
    return result
