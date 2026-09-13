#!/usr/bin/env python3
"""
Convert product pages (HTML/JSON) to a Google Merchant Center Excel feed.

Reuses Converter parsers and menu taxonomy, then writes one combined .xlsx
with a header row and product rows only (no instruction/example rows).

Usage:
    python google-converter.py input/ -o output/google-merchant.xlsx
    python google-converter.py input/product.html -o output/feed.xlsx
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from converter import (  # noqa: E402
    MenuTaxonomy,
    ProductJob,
    _is_output_directory,
    _is_product_file,
    assign_main_category,
    collect_matching_rules,
    discover_product_jobs,
    folder_segments_to_prefixed_paths,
    load_all_products,
    resolve_menu_category_paths,
    resolve_product_slug,
    sanitize_product_text,
    unique_output_path,
)
from google_merchant import (  # noqa: E402
    DEFAULT_SKU_PREFIX,
    DEFAULT_STORE_URL,
    build_google_merchant_rows,
    write_google_merchant_xlsx,
)


def enrich_product(
    product: Dict[str, Any],
    input_path: Path,
    *,
    brand_name: Optional[str] = None,
    folder_segments: Optional[List[str]] = None,
    brand_folder_segments: Optional[List[str]] = None,
    category_folder_segments: Optional[List[str]] = None,
    menu: Optional[MenuTaxonomy] = None,
) -> Dict[str, Any]:
    """Apply the same taxonomy / slug enrichment as converter.process_single."""
    b_folder = list(brand_folder_segments or [])
    c_folder = list(category_folder_segments or [])
    segments = folder_segments if folder_segments is not None else []
    bname = (
        brand_name
        or product.get("brand", "")
        or (b_folder[0] if b_folder else "")
        or input_path.parent.name
    )
    if bname and not product.get("brand"):
        product["brand"] = bname

    if menu is not None:
        product["_menu_taxonomy"] = menu
        brand_paths, category_paths, warns = resolve_menu_category_paths(
            product,
            bname,
            segments,
            menu,
            brand_folder_segments=b_folder or None,
            category_folder_segments=c_folder or None,
        )
        product["brand_paths"] = brand_paths
        product["category_paths"] = category_paths
        product["menu_category_paths"] = sorted(
            set(brand_paths) | set(category_paths),
            key=lambda p: (len(p.split(" > ")), p),
        )
        if brand_paths:
            print(f"  Brand path: {max(brand_paths, key=lambda p: len(p.split(' > ')))}")
        if category_paths:
            print(f"  Category path: {max(category_paths, key=lambda p: len(p.split(' > ')))}")
        for w in warns:
            print(f"  Warning: {w}")
    elif b_folder or c_folder:
        product["brand_paths"] = folder_segments_to_prefixed_paths(b_folder)
        product["category_paths"] = folder_segments_to_prefixed_paths(c_folder)
        product["menu_category_paths"] = sorted(
            set(product["brand_paths"]) | set(product["category_paths"]),
            key=lambda p: (len(p.split(" > ")), p),
        )

    product["mainCategory"] = assign_main_category(product)
    product["matchingRules"] = collect_matching_rules(product)
    product["slug"] = resolve_product_slug(product)
    return product


def load_enriched_products(
    input_path: Path,
    force_json: bool = False,
    *,
    brand_name: Optional[str] = None,
    folder_segments: Optional[List[str]] = None,
    brand_folder_segments: Optional[List[str]] = None,
    category_folder_segments: Optional[List[str]] = None,
    menu: Optional[MenuTaxonomy] = None,
) -> List[Dict[str, Any]]:
    print(f"Processing: {input_path.name}")
    loaded = load_all_products(input_path, force_json)
    products: List[Dict[str, Any]] = []
    for product, parser_name in loaded:
        product = sanitize_product_text(product)
        print(f"  Parser: {parser_name}")
        if not product.get("images") and not product.get("specifications"):
            print("  Warning: sparse extraction (no images or specifications)")
        products.append(
            enrich_product(
                product,
                input_path,
                brand_name=brand_name,
                folder_segments=folder_segments,
                brand_folder_segments=brand_folder_segments,
                category_folder_segments=category_folder_segments,
                menu=menu,
            )
        )
    return products


def rows_from_job(
    job: ProductJob,
    force_json: bool,
    menu: Optional[MenuTaxonomy],
    store_url: str,
    sku_prefix: str,
) -> List[Dict[str, str]]:
    products = load_enriched_products(
        job.input_path,
        force_json,
        brand_name=job.brand_name,
        folder_segments=job.folder_segments,
        brand_folder_segments=job.brand_folder_segments,
        category_folder_segments=job.category_folder_segments,
        menu=menu,
    )
    rows: List[Dict[str, str]] = []
    for product in products:
        rows.extend(
            build_google_merchant_rows(
                product,
                store_url=store_url,
                sku_prefix=sku_prefix,
            )
        )
    print(f"  Google rows: {len(rows)}")
    return rows


def resolve_output_xlsx(out: Path, original: str) -> Path:
    if _is_output_directory(out, original):
        out.mkdir(parents=True, exist_ok=True)
        return out / "google-merchant.xlsx"
    if out.suffix.lower() != ".xlsx":
        return out.with_suffix(".xlsx")
    return out


def collect_jobs(
    inp: Path,
    pattern: str,
    output_dir: Path,
    menu: Optional[MenuTaxonomy],
    brand_override: Optional[str],
    is_glob: bool,
) -> List[ProductJob]:
    if inp.is_dir():
        if menu is None:
            raise ValueError("Directory batch requires --menu-dir (default: Menu).")
        return discover_product_jobs(inp.resolve(), output_dir, menu, brand_override)

    if is_glob:
        files = sorted(Path(pattern).parent.glob(Path(pattern).name))
        jobs: List[ProductJob] = []
        for fp in files:
            if fp.is_file() and _is_product_file(fp):
                jobs.append(ProductJob(fp, output_dir / fp.name, brand_override or ""))
        return jobs

    if not inp.exists():
        raise FileNotFoundError(f"Input not found: {inp}")
    return [ProductJob(inp, output_dir / inp.name, brand_override or "")]


def load_menu(menu_dir: str, require: bool) -> Optional[MenuTaxonomy]:
    menu_path = Path(menu_dir)
    if not menu_path.is_absolute():
        candidate = SCRIPT_DIR / menu_path
        if candidate.is_dir():
            menu_path = candidate
    if menu_path.is_dir():
        menu = MenuTaxonomy.load(menu_path)
        print(
            f"Menu loaded: {len(menu.brand_trees)} brand tree(s), "
            f"{len(menu.store_trees)} store tree(s), {len(menu.all_paths)} path(s)"
        )
        return menu
    if require:
        raise FileNotFoundError(f"Menu directory not found: {menu_path}")
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert product pages (HTML/JSON) to a Google Merchant Excel feed",
    )
    parser.add_argument(
        "input",
        help="Input file, directory, or glob pattern (e.g. input/ or input/*)",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Output .xlsx file, or a directory to write google-merchant.xlsx into",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Force raw JSON parsing (default: auto-detect from file content)",
    )
    parser.add_argument(
        "--menu-dir",
        default="Menu",
        help="Menu taxonomy directory (default: Menu)",
    )
    parser.add_argument(
        "--prefix",
        default=DEFAULT_SKU_PREFIX,
        help=f"SKU prefix (default: {DEFAULT_SKU_PREFIX})",
    )
    parser.add_argument(
        "--store-url",
        default=DEFAULT_STORE_URL,
        help=f"Store origin including locale prefix (default: {DEFAULT_STORE_URL})",
    )
    parser.add_argument(
        "--brand",
        default=None,
        help="Brand name for single-brand directory input when folder name differs from Menu",
    )

    args = parser.parse_args()
    inp = Path(args.input)
    is_glob = "*" in args.input or "?" in args.input
    out = resolve_output_xlsx(Path(args.output), args.output)

    try:
        menu = load_menu(args.menu_dir, require=inp.is_dir())
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

    try:
        jobs = collect_jobs(inp, args.input, out.parent, menu, args.brand, is_glob)
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

    if not jobs:
        print(f"ERROR: No product files found under {args.input}")
        return 1

    print(f"Google Merchant: {len(jobs)} product file(s) -> {out.name}")
    all_rows: List[Dict[str, str]] = []
    ok = 0
    for i, job in enumerate(jobs, 1):
        try:
            print(f"\n[{i}/{len(jobs)}] {job.input_path}")
            all_rows.extend(
                rows_from_job(job, args.json, menu, args.store_url, args.prefix)
            )
            ok += 1
        except Exception as e:
            print(f"  ERROR: {e}")

    out, renamed = unique_output_path(out)
    if renamed:
        print(f"\nNote: output name taken; writing to {out.name}")
    write_google_merchant_xlsx(out, all_rows)
    print(
        f"\nOK: {ok}/{len(jobs)} products processed, "
        f"{len(all_rows)} Google Merchant row(s) -> {out}"
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
