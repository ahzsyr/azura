"""Map normalized Converter products to a Google Merchant Center Excel feed."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from openpyxl import Workbook

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from converter import (  # noqa: E402
    _extract_weight_kg,
    _normalize_video_entries,
    _safe_float,
    _variant_gallery_images,
    product_image_urls,
    resolve_product_slug,
    strip_control_chars,
)

DEFAULT_STORE_URL = "https://brt-me.com/en"
DEFAULT_SKU_PREFIX = "brt"
TITLE_MAX_LEN = 150
DESCRIPTION_MAX_LEN = 5000
HIGHLIGHT_MAX_LEN = 150

GOOGLE_MERCHANT_HEADERS: List[str] = [
    "id",
    "title",
    "description",
    "availability",
    "availability_date",
    "expiration_date",
    "link",
    "mobile_link",
    "image_link",
    "price",
    "sale_price",
    "sale_price_effective_date",
    "identifier_exists",
    "gtin",
    "mpn",
    "brand",
    "product_highlight",
    "product_detail",
    "additional_image_link",
    "condition",
    "adult",
    "color",
    "size",
    "size_type",
    "size_system",
    "gender",
    "material",
    "pattern",
    "age_group",
    "multipack",
    "is bundle",
    "unit_pricing_measure",
    "unit_pricing_base_measure",
    "energy_efficiency_class",
    "min_energy_efficiency_class",
    "max_energy_efficiency",
    "item_group_id",
    "video_link",
    "virtual_model_link",
    "cost_of_goods_sold",
]

REQUIRED_FIELDS = ("id", "title", "description", "link", "image_link", "price", "brand")

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def empty_merchant_row() -> Dict[str, str]:
    return {h: "" for h in GOOGLE_MERCHANT_HEADERS}


def strip_html(value: str) -> str:
    text = _HTML_TAG_RE.sub(" ", value or "")
    text = html.unescape(text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def format_merchant_price(value: Any, currency: str = "USD") -> str:
    amount = _safe_float(value)
    if amount is None:
        return ""
    code = (currency or "USD").strip().upper() or "USD"
    return f"{amount:.2f} {code}"


def map_availability(product: Dict[str, Any], stock: Optional[int] = None) -> str:
    """Always emit backorder for the Google Merchant spreadsheet feed."""
    return "backorder"


def map_condition(product: Dict[str, Any]) -> str:
    for opt in product.get("condition_options") or []:
        val = str(opt).strip().lower()
        if val in ("new", "used", "refurbished"):
            return val
    return "new"


def merchant_product_slug(product: Dict[str, Any]) -> str:
    """
    Landing-page slug for Google Merchant links.

    Always use converter.resolve_product_slug (WooCommerce title slug) so the
    URL matches the online store, not a source/Getic uid or imported slug.
    """
    return resolve_product_slug(product)


def build_product_link(slug: str, store_url: str = DEFAULT_STORE_URL) -> str:
    base = (store_url or DEFAULT_STORE_URL).rstrip("/")
    token = (slug or "").strip().strip("/")
    if not token:
        return ""
    return f"{base}/products/{token}"


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rstrip()


def resolve_description(product: Dict[str, Any]) -> str:
    for raw in (
        product.get("short_description") or "",
        product.get("description") or "",
    ):
        plain = strip_html(str(raw))
        if plain:
            return _truncate(plain, DESCRIPTION_MAX_LEN)
    details = build_product_details(product)
    if details:
        return _truncate(strip_html(details), DESCRIPTION_MAX_LEN)
    title = strip_html(str(product.get("title") or product.get("productTitle") or ""))
    return _truncate(title, DESCRIPTION_MAX_LEN)


def _quote_list(values: List[str]) -> str:
    cleaned = [v.strip() for v in values if v and str(v).strip()]
    if not cleaned:
        return ""
    if len(cleaned) == 1:
        return cleaned[0]
    return ", ".join(f'"{v}"' for v in cleaned)


def build_product_highlights(product: Dict[str, Any]) -> str:
    parts: List[str] = []
    seen: set[str] = set()

    def add(text: str) -> None:
        plain = _truncate(strip_html(text), HIGHLIGHT_MAX_LEN)
        key = plain.lower()
        if plain and key not in seen:
            seen.add(key)
            parts.append(plain)

    for item in product.get("highlights") or []:
        if isinstance(item, dict):
            add(str(item.get("label") or item.get("title") or item.get("text") or ""))
        else:
            add(str(item))

    for block in product.get("desc_blocks") or []:
        if not isinstance(block, dict):
            continue
        for feat in block.get("features") or []:
            if isinstance(feat, dict):
                add(str(feat.get("label") or feat.get("title") or feat.get("text") or ""))
            else:
                add(str(feat))
        heading = str(block.get("heading") or "")
        if heading.lower() in ("key features", "highlights") and block.get("text"):
            for line in re.split(r"[\n•]+", strip_html(str(block.get("text")))):
                add(line)

    return _quote_list(parts[:10])


def build_product_details(product: Dict[str, Any]) -> str:
    details: List[str] = []
    for group in product.get("specifications") or []:
        if not isinstance(group, dict):
            continue
        section = strip_html(str(group.get("technology") or "General")) or "General"
        for item in group.get("items") or []:
            if not isinstance(item, dict) or item.get("is_group"):
                continue
            name = strip_html(str(item.get("name") or ""))
            value = strip_html(str(item.get("value") or ""))
            if not name or not value:
                continue
            details.append(f"{section}:{name}:{value}")
    return _quote_list(details)


def _spec_value(product: Dict[str, Any], names: set[str]) -> str:
    wanted = {n.lower() for n in names}
    for group in product.get("specifications") or []:
        if not isinstance(group, dict):
            continue
        for item in group.get("items") or []:
            if not isinstance(item, dict) or item.get("is_group"):
                continue
            name = str(item.get("name") or "").strip().lower()
            if name in wanted:
                value = strip_html(str(item.get("value") or ""))
                if value:
                    return value
    return ""


def _base_sku(product: Dict[str, Any], sku_prefix: str) -> str:
    ean = str(product.get("ean") or "").strip()
    uid = str(product.get("uid") or "").strip()
    pid = str(product.get("id") or "").strip()
    slug = str(product.get("slug") or resolve_product_slug(product) or "").strip()
    token = ean or uid or pid or slug
    if not token:
        return ""
    prefix = (sku_prefix or "").strip()
    return f"{prefix}-{token}" if prefix else token


def _row_images(product: Dict[str, Any], variant: Optional[Dict[str, Any]] = None) -> tuple[str, str]:
    if variant:
        gallery = _variant_gallery_images(variant)
        if gallery:
            primary, extra = product_image_urls(product, gallery)
            return primary, ",".join(extra)
    default_color = str(product.get("default_color") or "")
    parent_images = [
        img
        for img in product.get("images", [])
        if isinstance(img, dict)
        and (
            not img.get("color")
            or str(img.get("color") or "") == default_color
            or not default_color
        )
    ]
    primary, extra = product_image_urls(product, parent_images or None)
    return primary, ",".join(extra)


def _price_pair(
    selling_price: Any,
    old_price: Any,
    currency: str,
) -> tuple[str, str]:
    current = _safe_float(selling_price)
    original = _safe_float(old_price)
    if current is None:
        return "", ""
    if original is not None and original > current:
        return format_merchant_price(original, currency), format_merchant_price(current, currency)
    return format_merchant_price(current, currency), ""


def _first_video_url(product: Dict[str, Any]) -> str:
    videos = _normalize_video_entries(product.get("videos") or [])
    if videos:
        return videos[0].get("url") or ""
    for block in product.get("desc_blocks") or []:
        if not isinstance(block, dict):
            continue
        nested = _normalize_video_entries(block.get("videos") or [])
        if nested:
            return nested[0].get("url") or ""
    return ""


def _virtual_model_url(product: Dict[str, Any]) -> str:
    model = product.get("model_3d")
    if isinstance(model, dict):
        return str(model.get("url") or "").strip()
    return ""


def _unit_pricing_measure(product: Dict[str, Any]) -> str:
    explicit = _spec_value(product, {"unit pricing measure", "unit_pricing_measure"})
    if explicit:
        return explicit
    weight = _extract_weight_kg(product.get("specifications") or [])
    if weight:
        return f"{weight} kg"
    return ""


def _clean_row(row: Dict[str, str]) -> Dict[str, str]:
    cleaned = empty_merchant_row()
    for key, value in row.items():
        if key not in cleaned:
            continue
        cleaned[key] = strip_control_chars("" if value is None else str(value))
    return cleaned


def _missing_required(row: Dict[str, str]) -> List[str]:
    return [name for name in REQUIRED_FIELDS if not str(row.get(name, "")).strip()]


def _fill_common(
    product: Dict[str, Any],
    *,
    store_url: str,
    sku: str,
    title: str,
    stock: Any,
    selling_price: Any,
    color: str,
    item_group_id: str,
    variant: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    row = empty_merchant_row()
    # Always re-derive from title via converter.resolve_product_slug so links
    # match the live store (avoids Mismatched online store URL from source slugs).
    slug = merchant_product_slug(product)
    product["slug"] = slug
    gtin = str(product.get("ean") or "").strip()
    mpn = str(product.get("mpn") or "").strip()
    brand = str(product.get("brand") or "").strip()
    currency = str(product.get("currency") or "USD")
    try:
        stock_n = int(stock or 0)
    except (TypeError, ValueError):
        stock_n = 0
    price, sale_price = _price_pair(selling_price, product.get("old_price"), currency)
    image_link, additional = _row_images(product, variant)
    description = resolve_description(product)

    row["id"] = sku
    row["title"] = _truncate(strip_html(title), TITLE_MAX_LEN)
    row["description"] = description
    row["availability"] = map_availability(product, stock_n)
    row["link"] = build_product_link(slug, store_url)
    row["image_link"] = image_link
    row["additional_image_link"] = additional
    row["price"] = price
    row["sale_price"] = sale_price
    row["identifier_exists"] = "yes" if (gtin or mpn) else "no"
    row["gtin"] = gtin
    row["mpn"] = mpn
    row["brand"] = brand
    row["product_highlight"] = build_product_highlights(product)
    row["product_detail"] = build_product_details(product)
    row["condition"] = map_condition(product)
    row["adult"] = "no"
    row["color"] = color
    row["size"] = _spec_value(product, {"apparel size", "clothing size"})
    row["gender"] = _spec_value(product, {"gender"})
    row["material"] = _spec_value(product, {"material", "fabric"})
    row["pattern"] = _spec_value(product, {"pattern"})
    row["age_group"] = _spec_value(product, {"age group", "age_group"})
    row["multipack"] = _spec_value(product, {"multipack"})
    row["unit_pricing_measure"] = _unit_pricing_measure(product)
    row["unit_pricing_base_measure"] = _spec_value(
        product, {"unit pricing base measure", "unit_pricing_base_measure"}
    )
    row["item_group_id"] = item_group_id
    row["video_link"] = _first_video_url(product)
    row["virtual_model_link"] = _virtual_model_url(product)
    return _clean_row(row)


def build_google_merchant_rows(
    product: Dict[str, Any],
    *,
    store_url: str = DEFAULT_STORE_URL,
    sku_prefix: str = DEFAULT_SKU_PREFIX,
    warn: Optional[Callable[..., None]] = print,
) -> List[Dict[str, str]]:
    """Build one Google Merchant row per sellable SKU (variants, not WooCommerce parents)."""
    title = str(product.get("title") or product.get("productTitle") or product.get("name") or "")
    base = _base_sku(product, sku_prefix)
    regular_price = product.get("regular_price")
    stock = product.get("stock", 0)
    default_color = str(product.get("default_color") or "")

    color_variants: List[Dict[str, Any]] = list(product.get("color_variants") or [])
    available_colors: List[str] = list(product.get("available_colors") or [])
    if not available_colors:
        available_colors = [str(v.get("color") or "") for v in color_variants if v.get("color")]
    has_colors = bool(available_colors)
    available_plugs: List[str] = list(product.get("available_plugs") or [])
    has_plugs = bool(available_plugs)

    candidates: List[Dict[str, str]] = []
    if has_colors:
        variants = color_variants or [{"color": c} for c in available_colors]
        for cv in variants:
            color = str(cv.get("color") or "").strip()
            if not color:
                continue
            raw_sku = str(cv.get("sku") or "").strip()
            var_sku = f"{sku_prefix}-{raw_sku}" if raw_sku else f"{base}-{color.lower()}"
            var_price = cv.get("price") if cv.get("price") not in (None, "") else regular_price
            var_stock = cv.get("stock") if cv.get("stock") is not None else stock
            candidates.append(
                _fill_common(
                    product,
                    store_url=store_url,
                    sku=var_sku,
                    title=f"{title} – {color}" if title else color,
                    stock=var_stock,
                    selling_price=var_price,
                    color=color,
                    item_group_id=base,
                    variant=cv,
                )
            )
    elif has_plugs:
        for plug in available_plugs:
            plug_s = str(plug).strip()
            if not plug_s:
                continue
            candidates.append(
                _fill_common(
                    product,
                    store_url=store_url,
                    sku=f"{base}-{plug_s.lower()}",
                    title=f"{title} – {plug_s}" if title else plug_s,
                    stock=stock,
                    selling_price=regular_price,
                    color=default_color,
                    item_group_id=base,
                )
            )
    else:
        candidates.append(
            _fill_common(
                product,
                store_url=store_url,
                sku=base,
                title=title,
                stock=stock,
                selling_price=regular_price,
                color=default_color,
                item_group_id="",
            )
        )

    rows: List[Dict[str, str]] = []
    for row in candidates:
        missing = _missing_required(row)
        if missing:
            if warn is not None:
                warn(
                    f"  Warning: skipping Google Merchant row {row.get('id')!r}: "
                    f"missing {', '.join(missing)}"
                )
            continue
        rows.append(row)
    return rows


def write_google_merchant_xlsx(path: Path, rows: List[Dict[str, str]]) -> None:
    """Write header row + product rows only (no Google instruction/example rows)."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Google Merchant"
    ws.append(list(GOOGLE_MERCHANT_HEADERS))
    for row in rows:
        cleaned = _clean_row(row)
        ws.append([cleaned.get(h, "") for h in GOOGLE_MERCHANT_HEADERS])
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
