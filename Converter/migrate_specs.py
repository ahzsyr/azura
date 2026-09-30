#!/usr/bin/env python3
"""Re-normalize product JSON files with canonical specification mapping."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running from Converter/ directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

import converter
from specifications import apply_spec_normalization


def migrate_file(path: Path, *, dry_run: bool = False, write_csv: bool = False) -> None:
    product, parser = converter.load_and_normalize(path)
    apply_spec_normalization(product)
    canon = len(product.get("canonical_specs") or {})
    unmapped = len(product.get("unmapped_specs") or [])
    ambiguous = len(product.get("ambiguous_specs") or [])
    print(f"{path.name}: parser={parser} canonical={canon} unmapped={unmapped} ambiguous={ambiguous}")
    if dry_run:
        return
    out_json = path.with_suffix(".json") if path.suffix != ".json" else path
    payload = converter.build_product_json(product)
    out_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if write_csv:
        csv_path = out_json.with_suffix(".csv")
        converter.write_csv(csv_path, converter.build_csv_rows(product))


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate product specs to canonical_specs")
    parser.add_argument("paths", nargs="+", help="Product HTML/JSON files or directories")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not write")
    parser.add_argument("--csv", action="store_true", help="Also write companion CSV")
    args = parser.parse_args()

    converter.SAMPLE_CSV_PATH = str(Path(__file__).resolve().parent / "template.csv")
    converter.SAMPLE_JSON_TEMPLATE_PATH = str(
        Path(__file__).resolve().parent / "template-json.json"
    )

    files: list[Path] = []
    for raw in args.paths:
        p = Path(raw)
        if p.is_dir():
            files.extend(sorted(p.rglob("*")))
        else:
            files.append(p)
    files = [f for f in files if f.is_file() and not f.name.startswith(".")]

    for path in files:
        try:
            migrate_file(path, dry_run=args.dry_run, write_csv=args.csv)
        except Exception as exc:
            print(f"ERROR {path}: {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
