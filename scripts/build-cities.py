#!/usr/bin/env python3
"""Genera docs/data/cities.json a partir de public/files/world_cities.csv."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "files" / "world_cities.csv"
TARGET = ROOT / "docs" / "data" / "cities.json"


def main() -> None:
    with SOURCE.open(encoding="utf-8", newline="") as handle:
        cities = sorted({row["city"] for row in csv.DictReader(handle)})
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        json.dumps(cities, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"{len(cities)} cities -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
