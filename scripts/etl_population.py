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
            code = row["code"]
            pop = int(row["population"])
            if pop <= 0:
                raise ValueError(
                    f"人口が 0 以下のデータが検出されました: code={code}, population={pop}"
                )
            result[code] = pop
    return result
