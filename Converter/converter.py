#!/usr/bin/env python3
"""
Universal product page HTML/JSON to WooCommerce Import CSV Converter
====================================================================

Auto-detects input format and parses Getic vike_pageContext, Ubiquiti UniFi
store pages, raw JSON, JSON-LD Product schema, or generic product HTML into
WooCommerce CSV + JSON.

Usage:
    python converter.py input/ -o output/
    python converter.py input/unifi-U7-Pro-XG -o output/ --format unifi

If the target file already exists, the new file is saved as stem (1).ext, stem (2).ext, etc.
"""

from __future__ import annotations

import argparse
import csv
import html
import io
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Set, Tuple
from urllib.parse import parse_qs, unquote, urlparse

from bs4 import BeautifulSoup

BASE_URL = "https://www.getic.com"

PLUG_VARIATIONS = {
    "cfbb89b0-7217-11eb-ed9f-fa163e4a2e20": "EU",
    "d26ea1e2-7217-11eb-ed9f-fa163e4a2e20": "UK",
    "d4b5f02c-7217-11eb-ed9f-fa163e4a2e20": "US",
}

STANDARD_PLUGS = ["EU", "UK", "US"]

CONDITION_NEW = "000000001"

SAMPLE_CSV_PATH: Optional[str] = None
SAMPLE_JSON_TEMPLATE_PATH: Optional[str] = "template-json.json"
SKU_PREFIX = "brt"

# Edit these hex values to match your WooCommerce store brand
DESCRIPTION_THEME = {
    "primary": "#2563eb",
    "primary_dark": "#1e40af",
    "surface": "#fafbfc",
    "border": "#e5e7eb",
    "text": "#1a1a1a",
    "text_muted": "#4b5563",
}


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def load_csv_headers() -> List[str]:
    if SAMPLE_CSV_PATH is None:
        raise ValueError("Sample CSV template path not set.")
    path = Path(SAMPLE_CSV_PATH)
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    with path.open("r", encoding="utf-8", newline="") as f:
        return next(csv.reader(f))


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def normalize_resource_path(path: str) -> str:
    """Normalize JSON-escaped paths (e.g. https:\\/\\/host) to clean URL paths."""
    if not path:
        return ""
    path = path.strip()
    path = path.replace("\\/", "/")
    path = path.replace("\\", "")
    if path.startswith("https:/") and not path.startswith("https://"):
        path = "https://" + path[len("https:/") :]
    if path.startswith("http:/") and not path.startswith("http://"):
        path = "http://" + path[len("http:/") :]
    dup = re.search(r"https?://www\.getic\.com/(https?://.+)", path, re.IGNORECASE)
    if dup:
        path = dup.group(1)
    return path


def make_absolute_url(path: Optional[str], base_url: Optional[str] = None) -> str:
    if not path:
        return ""
    path = normalize_resource_path(path)
    if path.startswith(("http://", "https://")):
        return path
    base = (base_url or BASE_URL).rstrip("/")
    return base + "/" + path.lstrip("/")


def _url_origin(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return ""


def resolve_page_base_url(html_content: str) -> str:
    """Derive site origin from canonical, base, or og:url; fallback to Getic."""
    patterns = [
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
        r'<base[^>]+href=["\']([^"\']+)["\']',
        r'<meta[^>]+property=["\']og:url["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:url["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html_content, re.IGNORECASE | re.DOTALL)
        if match:
            origin = _url_origin(match.group(1).strip())
            if origin:
                return origin
    return BASE_URL


def read_file_text(path: Path) -> str:
    """Read text with UTF-8 first, latin-1 fallback."""
    raw = path.read_bytes()
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def detect_input_format(content: str) -> Literal["json", "html"]:
    stripped = content.lstrip("\ufeff").lstrip()
    if stripped.startswith(("{", "[")):
        try:
            json.loads(content)
            return "json"
        except json.JSONDecodeError:
            pass
    return "html"


# Scraped pages sometimes carry stray control bytes. Left in the CSV they make
# PHP fileinfo report application/octet-stream, and WordPress then refuses the
# upload with "Sorry, you are not allowed to upload this file type."
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def strip_control_chars(text: str) -> str:
    """Drop control bytes, keeping tab, newline and carriage return."""
    return _CONTROL_CHARS_RE.sub("", text)


def sanitize_product_text(value: Any) -> Any:
    """Recursively strip control characters from every string in a product record."""
    if isinstance(value, str):
        return strip_control_chars(value)
    if isinstance(value, list):
        return [sanitize_product_text(v) for v in value]
    if isinstance(value, dict):
        return {k: sanitize_product_text(v) for k, v in value.items()}
    return value


def _as_dict(value: Any) -> Dict[str, Any]:
    """Return value if it is a dict; JSON null/missing values become {}."""
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> List[Any]:
    """Return value if it is a list; JSON null/missing values become []."""
    return value if isinstance(value, list) else []


def _is_json_blob(text: str) -> bool:
    """Return True if text is raw JSON that should not appear in descriptions."""
    stripped = text.strip()
    if not stripped:
        return False
    if stripped.startswith("{") or stripped.startswith("[{"):
        try:
            json.loads(stripped)
            return True
        except Exception:
            pass
    return stripped.count('":"') > 3 and stripped.count('":{') > 0


# ---------------------------------------------------------------------------
# Input loading & normalization helpers
# ---------------------------------------------------------------------------

YOUTUBE_URL_RE = re.compile(
    r"(?:https?://)?(?:www\.)?(?:youtube\.com/embed/|youtu\.be/)([A-Za-z0-9_-]+)"
)


def _extract_youtube_urls(text: str) -> List[str]:
    urls: List[str] = []
    seen: Set[str] = set()
    for m in YOUTUBE_URL_RE.finditer(text or ""):
        url = f"https://youtube.com/embed/{m.group(1)}"
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def _prop_value_by_uid(properties: List[Any], uid: str) -> str:
    for prop in properties:
        if not isinstance(prop, dict) or prop.get("uid") != uid:
            continue
        val = prop.get("value", "")
        if isinstance(val, dict):
            title = val.get("title", {})
            if isinstance(title, dict):
                return str(title.get("en", "") or next(iter(title.values()), ""))
            return str(title)
        return str(val)
    return ""


def _product_stock_from_amounts(amounts: List[Any], condition_id: str = CONDITION_NEW) -> int:
    total = 0
    for amt in amounts:
        if not isinstance(amt, dict):
            continue
        if amt.get("conditionId") == condition_id and amt.get("warehouseId") == 1:
            total += int(amt.get("amount", 0))
    return total


def _price_from_price_groups(groups: List[Any], condition_id: str = CONDITION_NEW) -> Optional[float]:
    for pg in groups:
        if not isinstance(pg, dict) or pg.get("conditionId") != condition_id:
            continue
        price_items = sorted(_as_list(pg.get("prices")), key=lambda p: p.get("from", 0))
        if price_items:
            try:
                return float(price_items[0].get("price", 0))
            except (TypeError, ValueError):
                return None
    return None


def _map_bought_together_items(
    items: List[Any],
    currency: str,
) -> List[Dict[str, Any]]:
    mapped: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        props = _as_list(item.get("properties"))
        mpn = _prop_value_by_uid(props, "mpn")
        stock = _product_stock_from_amounts(_as_list(item.get("amounts")))
        price = _price_from_price_groups(_as_list(item.get("prices")))
        mapped.append({
            "name": item.get("title", ""),
            "url": f"/product/{item.get('uid', '')}",
            "price": price,
            "currency": currency,
            "mpn": mpn,
            "availability": "InStock" if stock > 0 else "OutOfStock",
        })
    return mapped


# ---------------------------------------------------------------------------
# Input loading & normalization
# ---------------------------------------------------------------------------

def extract_json_from_html(html_content: str) -> Dict[str, Any]:
    match = re.search(
        r'<script\s+id="vike_pageContext"\s+type="application/json">(.*?)</script>',
        html_content,
        re.DOTALL,
    )
    if match:
        return json.loads(match.group(1))
    raise ValueError("Could not find vike_pageContext in HTML.")


def normalize_from_html_context(
    ctx: Dict[str, Any],
    html_content: str = "",
) -> Dict[str, Any]:
    """Convert vike_pageContext data into a unified internal schema."""
    state = _as_dict(_as_dict(ctx.get("data")).get("state"))
    product_info = _as_dict(state.get("productInfo"))
    product = _as_dict(product_info.get("product"))
    site_settings = _as_dict(state.get("siteSettings"))
    product_prices = _as_dict(state.get("productPrices"))
    spec_items = _as_list(_as_dict(state.get("productSpec")).get("items"))

    # Group flat spec items by technology
    spec_groups: Dict[str, List[Dict]] = {}
    for item in spec_items:
        if not isinstance(item, dict):
            continue
        tech = item.get("technology", "General")
        spec_groups.setdefault(tech, []).append({
            "name": item.get("feature", ""),
            "value": item.get("featureText", ""),
            "canonicalUid": item.get("canonicalUid"),
        })
    specifications = [
        {"technology": tech, "items": items}
        for tech, items in spec_groups.items()
    ]

    # Extract country of origin
    country_of_origin = ""
    for prop in _as_list(product.get("properties")):
        if not isinstance(prop, dict):
            continue
        if prop.get("uid") == "country_of_origin":
            val = prop.get("value", "")
            if isinstance(val, dict):
                title = val.get("title", {})
                if isinstance(title, dict):
                    country_of_origin = title.get("en", "") or next(iter(title.values()), "")
                else:
                    country_of_origin = str(title)
            else:
                country_of_origin = str(val)
        elif prop.get("uid") == "mpn":
            pass  # handled separately

    # Extract MPN / EAN from properties
    mpn = ""
    ean = ""
    for prop in _as_list(product.get("properties")):
        if not isinstance(prop, dict):
            continue
        if prop.get("uid") == "mpn":
            mpn = str(prop.get("value", ""))
        elif prop.get("uid") == "ean":
            ean = str(prop.get("value", ""))

    # Build description blocks list (text + inline media from description.blocks)
    desc_obj = _as_dict(product.get("description"))
    desc_blocks = []
    for block in sorted(
        _as_list(desc_obj.get("blocks")),
        key=lambda b: b.get("num", 0) if isinstance(b, dict) else 0,
    ):
        if not isinstance(block, dict):
            continue
        options = [
            o.get("name", "")
            for o in _as_list(block.get("options"))
            if isinstance(o, dict)
        ]
        is_header = "block-type-header" in options
        raw_text = (block.get("text") or "").strip()
        text = None if _is_json_blob(raw_text) else (raw_text or None)
        align = "center" if "text-align-center" in options else "left"
        media = []
        for m in _as_list(block.get("media")):
            if not isinstance(m, dict):
                continue
            url = make_absolute_url(m.get("url", ""))
            if url:
                media.append({
                    "url": url,
                    "width": int(m.get("width") or 0),
                    "height": int(m.get("height") or 0),
                })
        if is_header and raw_text:
            desc_blocks.append({"heading": raw_text, "text": None, "media": [], "align": align})
        elif text or media:
            desc_blocks.append({
                "heading": None,
                "text": text,
                "media": media,
                "align": align,
            })

    # Build images list (medium for CSV) and full gallery with all variants for JSON
    images = []
    image_gallery: List[Dict[str, Any]] = []
    thumbnails: List[Dict[str, str]] = []
    title_alt = product.get("title", "")
    for img in _as_list(product.get("images")):
        if not isinstance(img, dict):
            continue
        variants = _as_list(img.get("variants"))
        variant_urls: Dict[str, str] = {}
        for v in variants:
            if not isinstance(v, dict):
                continue
            vname = v.get("variant", "")
            path = make_absolute_url(v.get("path", ""))
            if vname and path:
                variant_urls[vname] = path
        url = ""
        for preferred in ["medium", "large", "small", "tiny"]:
            url = variant_urls.get(preferred, "")
            if url:
                break
        if not url and variant_urls:
            url = next(iter(variant_urls.values()))
        if url:
            images.append({"url": url, "alt": title_alt})
            image_gallery.append({"variants": variant_urls, "alt": title_alt})
            tiny = variant_urls.get("tiny", "")
            if tiny:
                thumbnails.append({"url": tiny, "alt": title_alt})

    # Files
    files = []
    for f in _as_list(product.get("files")):
        file_url = make_absolute_url(f.get("path", ""))
        if file_url:
            files.append({"title": f.get("title", ""), "url": file_url})

    # Prices
    regular_price = ""
    old_price: Optional[float] = None
    for pg in _as_list(product.get("prices")):
        if pg.get("conditionId") == CONDITION_NEW:
            price_items = sorted(pg.get("prices", []), key=lambda p: p.get("from", 0))
            if price_items:
                regular_price = str(price_items[0].get("price", ""))
                op = price_items[0].get("oldPrice")
                if op is not None:
                    old_price = float(op)
            break

    currency = str(site_settings.get("currency", "USD") or "USD").upper()
    if currency not in ("USD", "EUR", "AED", "GBP", "JPY"):
        currency = "USD"

    # Stock
    stock = 0
    variations = _as_list(product.get("variations"))
    if variations:
        for var in variations:
            for amt in var.get("amounts", []):
                if amt.get("conditionId") == CONDITION_NEW and amt.get("warehouseId") == 1:
                    stock += int(amt.get("amount", 0))
    else:
        for amt in _as_list(product.get("amounts")):
            if amt.get("conditionId") == CONDITION_NEW and amt.get("warehouseId") == 1:
                stock += int(amt.get("amount", 0))

    # Available plugs from variations
    available_plugs = []
    for var in variations:
        vid = var.get("id", "")
        if vid in PLUG_VARIATIONS:
            plug = PLUG_VARIATIONS[vid]
            if plug not in available_plugs:
                available_plugs.append(plug)
    plug_order = {"EU": 0, "UK": 1, "US": 2}
    available_plugs.sort(key=lambda p: plug_order.get(p, 99))

    # Category paths
    preset_nav = _as_dict(product.get("presetNavData"))
    path_data = _as_list(preset_nav.get("pathData"))
    brand_path_titles = [
        p.get("title", "") for p in path_data if isinstance(p, dict) and p.get("title")
    ]
    category_root = preset_nav.get("title", "")

    preset_by_cat = _as_dict(product.get("presetNavDataByCategory"))
    cat_path_data = _as_list(preset_by_cat.get("pathData"))
    cat_path_titles = [
        p.get("title", "") for p in cat_path_data if isinstance(p, dict) and p.get("title")
    ]
    cat_leaf = preset_by_cat.get("title", "")

    # Reviews
    reviews_data = _as_dict(product.get("reviews"))
    reviews_list = _as_list(reviews_data.get("reviews"))
    reviews_details = _as_dict(reviews_data.get("details"))
    reviews_source = ""
    if reviews_list:
        reviews_source = str(reviews_list[0].get("source", "") or "TrustPilot")

    # Condition options from productPrices
    condition_options: List[str] = []
    for cond in _as_list(product_prices.get("conditions")):
        if not isinstance(cond, dict):
            continue
        title = _as_dict(cond.get("title")).get("en", "")
        if not title and isinstance(cond.get("title"), str):
            title = cond.get("title", "")
        title = str(title).strip().lower()
        if title in ("new", "used", "refurbished") and title not in condition_options:
            condition_options.append(title)
    if not condition_options:
        condition_options = ["new"]

    # Videos from description blocks
    videos: List[Dict[str, str]] = []
    seen_video_urls: Set[str] = set()
    for block in _as_list(desc_obj.get("blocks")):
        if not isinstance(block, dict):
            continue
        for m in _as_list(block.get("media")):
            if not isinstance(m, dict):
                continue
            vurl = make_absolute_url(m.get("url", ""))
            if not vurl or vurl in seen_video_urls:
                continue
            media_type = str(m.get("mediaType", "") or "").lower()
            ext = str(m.get("extension", "") or "").lower()
            if "youtube" in vurl or "youtu.be" in vurl:
                seen_video_urls.add(vurl)
                videos.append({"url": vurl, "type": "youtube"})
            elif media_type == "video" or ext in ("mp4", "webm", "mov"):
                seen_video_urls.add(vurl)
                videos.append({"url": vurl, "type": "upload"})

    for yt in _extract_youtube_urls(html_content):
        if yt not in seen_video_urls:
            seen_video_urls.add(yt)
            videos.append({"url": yt, "type": "youtube"})

    # Bought together
    bought_together = _map_bought_together_items(
        _as_list(product_info.get("boughtTogether")),
        currency,
    )

    # Certifications
    certifications: List[Any] = []
    for cert in _as_list(product_info.get("brandCertificates")):
        if isinstance(cert, str):
            certifications.append(cert)
        elif isinstance(cert, dict):
            certifications.append({
                "name": cert.get("name", cert.get("title", "")),
                "image": make_absolute_url(cert.get("image", cert.get("path", ""))),
                "link": cert.get("link", cert.get("url", "")),
                "type": cert.get("type", ""),
            })

    default_plug = ""
    variation_info = _as_dict(product_prices.get("variation"))
    if variation_info:
        plug_name = _as_dict(variation_info.get("name")).get("en", "")
        if plug_name in PLUG_VARIATIONS.values():
            default_plug = plug_name

    has_3d_model = bool(product.get("model3DData"))

    return {
        "id": str(product.get("id", "")),
        "uid": product.get("uid", ""),
        "title": product.get("title", ""),
        "title_extended": product.get("titleExtended", ""),
        "short_description": product.get("descShort", ""),
        "brand": product.get("brand", ""),
        "mpn": mpn,
        "ean": ean,
        "warranty": str(product.get("warranty", "")),
        "country_of_origin": country_of_origin,
        "regular_price": regular_price,
        "old_price": old_price,
        "currency": currency,
        "stock": stock,
        "available_plugs": available_plugs,
        "default_plug": default_plug,
        "condition_options": condition_options,
        "images": images,
        "image_gallery": image_gallery,
        "thumbnails": thumbnails,
        "videos": videos,
        "files": files,
        "specifications": specifications,
        "desc_blocks": desc_blocks,
        "brand_path_titles": brand_path_titles,
        "category_root": category_root,
        "cat_path_titles": cat_path_titles,
        "cat_leaf": cat_leaf,
        "reviews_count": reviews_data.get("countOfReviews", 0),
        "reviews_rating": reviews_data.get("rating", 0),
        "reviews_list": reviews_list,
        "reviews_details": reviews_details,
        "reviews_source": reviews_source,
        "bought_together": bought_together,
        "certifications": certifications,
        "has_3d_model": has_3d_model,
    }


def normalize_from_json(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert raw JSON (sample.json style) into the unified internal schema."""
    media = _as_dict(data.get("media"))
    # Images
    images = []
    for img in _as_list(media.get("images")):
        url = img.get("url", "")
        if url:
            images.append({"url": make_absolute_url(url), "alt": img.get("alt", "")})

    # Files
    files = []
    for f in _as_list(media.get("files")) or _as_list(data.get("documents")):
        url = f.get("url", "")
        if url:
            files.append({"title": f.get("title", ""), "url": make_absolute_url(url)})

    # Specifications — JSON has grouped structure
    specifications = []
    for group in _as_list(data.get("specifications")):
        tech = group.get("technology", "General")
        items = [{"name": i.get("name", ""), "value": i.get("value", ""), "canonicalUid": None}
                 for i in group.get("items", [])]
        if items:
            specifications.append({"technology": tech, "items": items})

    # Description blocks
    desc_blocks = []
    for block in _as_list(data.get("detailed_description")):
        heading = block.get("heading")
        raw_text = (block.get("text") or "").strip()
        text = None if _is_json_blob(raw_text) else (raw_text or None)
        align = block.get("align", "left")
        media = []
        for key in ("media", "images"):
            for m in block.get(key) or []:
                if isinstance(m, str):
                    url = make_absolute_url(m)
                    if url:
                        media.append({"url": url, "width": 0, "height": 0})
                elif isinstance(m, dict):
                    url = make_absolute_url(m.get("url", ""))
                    if url:
                        media.append({
                            "url": url,
                            "width": int(m.get("width") or 0),
                            "height": int(m.get("height") or 0),
                        })
        img = block.get("image")
        if isinstance(img, str) and img:
            url = make_absolute_url(img)
            if url:
                media.append({"url": url, "width": 0, "height": 0})
        elif isinstance(img, dict) and img.get("url"):
            url = make_absolute_url(img["url"])
            if url:
                media.append({
                    "url": url,
                    "width": int(img.get("width") or 0),
                    "height": int(img.get("height") or 0),
                })
        if heading or text or media:
            desc_blocks.append({
                "heading": heading,
                "text": text if not heading else None,
                "media": media,
                "align": align,
            })

    # Price
    price_obj = _as_dict(data.get("price"))
    regular_price = str(price_obj.get("value", "")) if price_obj else ""

    # Stock (JSON doesn't have per-warehouse stock, use stock_status)
    stock = 0
    stock_status = data.get("stock_status", "")
    if stock_status == "in_stock":
        stock = 3  # default placeholder

    # Plugs
    plug_options = _as_list(data.get("plug_options"))
    available_plugs = [p.upper() for p in plug_options if p.upper() in ("EU", "UK", "US")]
    if not available_plugs and plug_options:
        available_plugs = plug_options

    # Category paths from JSON categories field
    cats = _as_list(data.get("categories"))
    brand_name = data.get("brand", "")
    brand_path_titles = []
    if cats:
        brand_path_titles = cats[:-1] if len(cats) > 1 else []
    category_root = cats[-1] if cats else ""
    cat_path_titles = []
    cat_leaf = data.get("category", "")

    # Reviews
    reviews_data = _as_dict(data.get("reviews"))

    return {
        "id": str(data.get("id", "")),
        "uid": data.get("slug", data.get("id", "")),
        "title": data.get("productTitle", data.get("title", data.get("name", ""))),
        "title_extended": data.get("title_extended", ""),
        "short_description": data.get("short_description", data.get("description", "")),
        "brand": brand_name,
        "mpn": data.get("mpn", data.get("manufacturer_part_number", "")),
        "ean": data.get("ean", ""),
        "warranty": str(data.get("warranty", "")).replace(" months", "").strip(),
        "country_of_origin": "",
        "regular_price": regular_price,
        "stock": stock,
        "available_plugs": available_plugs,
        "images": images,
        "files": files,
        "specifications": specifications,
        "desc_blocks": desc_blocks,
        "brand_path_titles": brand_path_titles,
        "category_root": category_root,
        "cat_path_titles": cat_path_titles,
        "cat_leaf": cat_leaf,
        "reviews_count": reviews_data.get("count", 0),
        "reviews_rating": reviews_data.get("rating", 0),
        "reviews_list": _as_list(reviews_data.get("comments")),
        "reviews_details": _as_dict(reviews_data.get("breakdown")),
        "reviews_source": reviews_data.get("source", ""),
        "bought_together": _as_list(data.get("bought_together")),
        "certifications": _as_list(data.get("certifications")),
        "has_3d_model": bool(_as_dict(data.get("media")).get("3d_model")),
        "currency": _as_dict(data.get("price")).get("currency", "USD"),
        "old_price": data.get("old_price"),
        "condition_options": _as_list(data.get("condition_options")) or ["new"],
        "default_plug": "",
        "image_gallery": [],
        "thumbnails": _as_list(_as_dict(data.get("media")).get("thumbnails")),
        "videos": _as_list(_as_dict(data.get("media")).get("videos")),
    }


def normalize_from_generic(data: Dict[str, Any], base_url: Optional[str] = None) -> Dict[str, Any]:
    """Convert generic HTML/JSON-LD extraction into the unified internal schema."""
    images: List[Dict[str, str]] = []
    for img in _as_list(data.get("images")):
        if isinstance(img, str):
            url = make_absolute_url(img, base_url)
            if url:
                images.append({"url": url, "alt": ""})
        elif isinstance(img, dict):
            url = make_absolute_url(img.get("url", ""), base_url)
            if url:
                entry = {"url": url, "alt": img.get("alt", "")}
                if img.get("color"):
                    entry["color"] = img["color"]
                images.append(entry)

    files: List[Dict[str, str]] = []
    for f in _as_list(data.get("files")):
        if isinstance(f, dict):
            url = make_absolute_url(f.get("url", ""), base_url)
            if url:
                files.append({"title": f.get("title", ""), "url": url})

    specifications: List[Dict[str, Any]] = []
    for group in _as_list(data.get("specifications")):
        if not isinstance(group, dict):
            continue
        tech = group.get("technology", "General")
        items = []
        for i in _as_list(group.get("items")):
            if not isinstance(i, dict):
                continue
            item: Dict[str, Any] = {
                "name": i.get("name", ""),
                "value": i.get("value", ""),
                "canonicalUid": i.get("canonicalUid"),
            }
            if i.get("is_group"):
                item["is_group"] = True
            if i.get("parent"):
                item["parent"] = i.get("parent")
            items.append(item)
        if items:
            specifications.append({"technology": tech, "items": items})

    desc_blocks: List[Dict[str, Any]] = []
    for block in _as_list(data.get("desc_blocks")):
        if isinstance(block, dict):
            desc_blocks.append({
                "heading": block.get("heading"),
                "text": block.get("text"),
                "media": block.get("media", []),
                "align": block.get("align", "left"),
                "tab": block.get("tab"),
                "videos": block.get("videos") or [],
                "features": block.get("features") or [],
                "model_3d": block.get("model_3d"),
            })

    price_obj = _as_dict(data.get("price"))
    regular_price = str(data.get("regular_price", "") or price_obj.get("value", ""))
    currency = str(data.get("currency") or price_obj.get("currency") or "USD")

    stock = data.get("stock", 0)
    try:
        stock = int(stock or 0)
    except (TypeError, ValueError):
        stock = 0

    return {
        "id": str(data.get("id", "")),
        "uid": data.get("slug", data.get("uid", data.get("mpn", ""))),
        "title": data.get("title", data.get("productTitle", data.get("name", ""))),
        "title_extended": data.get("title_extended", ""),
        "short_description": data.get("short_description", data.get("description", "")),
        "brand": data.get("brand", ""),
        "mpn": data.get("mpn", data.get("sku", "")),
        "ean": data.get("ean", ""),
        "warranty": str(data.get("warranty", "")).replace(" months", "").strip(),
        "country_of_origin": data.get("country_of_origin", ""),
        "regular_price": regular_price,
        "stock": stock,
        "available_plugs": _as_list(data.get("available_plugs")),
        "images": images,
        "files": files,
        "specifications": specifications,
        "desc_blocks": desc_blocks,
        "brand_path_titles": _as_list(data.get("brand_path_titles")),
        "category_root": data.get("category_root", ""),
        "cat_path_titles": _as_list(data.get("cat_path_titles")),
        "cat_leaf": data.get("cat_leaf", ""),
        "reviews_count": data.get("reviews_count", 0),
        "reviews_rating": data.get("reviews_rating", 0),
        "reviews_list": _as_list(data.get("reviews_list")),
        "reviews_details": _as_dict(data.get("reviews_details")),
        "reviews_source": data.get("reviews_source", ""),
        "bought_together": _as_list(data.get("bought_together")),
        "certifications": _as_list(data.get("certifications")),
        "has_3d_model": bool(data.get("has_3d_model")),
        "currency": currency,
        "old_price": data.get("old_price"),
        "condition_options": _as_list(data.get("condition_options")) or ["new"],
        "default_plug": data.get("default_plug", ""),
        "image_gallery": _as_list(data.get("image_gallery")),
        "thumbnails": _as_list(data.get("thumbnails")),
        "videos": _as_list(data.get("videos")),
        "model_3d": data.get("model_3d"),
        "color_variants": _as_list(data.get("color_variants")),
        "available_colors": _as_list(data.get("available_colors")),
        "default_color": data.get("default_color", ""),
        "breadcrumbs": _as_list(data.get("breadcrumbs")),
        "compare_product_ids": _as_list(data.get("compare_product_ids")),
        "output_format": data.get("output_format", ""),
    }


SKIP_IMAGE_PATTERNS = (
    "favicon", "logo", "icon", "zixun", "close02", "close.png",
    "fx1.png", "fx2.png", "fx3.png", "fx4.png", "download_img",
    "img360", "360",
)


def _is_skip_image(src: str) -> bool:
    lower = src.lower()
    return any(p in lower for p in SKIP_IMAGE_PATTERNS)


def _clean_page_title(title: str) -> str:
    for sep in ("|", " – ", " — ", " - "):
        if sep in title:
            return title.split(sep)[0].strip()
    if ": " in title:
        return title.split(": ", 1)[0].strip()
    return title.strip()


def _find_json_ld_product(data: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(data, dict):
        return None
    type_val = data.get("@type", "")
    if type_val == "Product" or (isinstance(type_val, list) and "Product" in type_val):
        return data
    graph = data.get("@graph")
    if isinstance(graph, list):
        for item in graph:
            found = _find_json_ld_product(item)
            if found:
                return found
    return None


def try_parse_getic_vike_context(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    try:
        ctx = extract_json_from_html(content)
        return normalize_from_html_context(ctx, content)
    except ValueError:
        return None


def try_parse_json_ld_product(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    soup = BeautifulSoup(content, "html.parser")
    product_ld: Optional[Dict[str, Any]] = None
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        product_ld = _find_json_ld_product(data)
        if product_ld:
            break
    if not product_ld:
        return None

    brand = product_ld.get("brand", "")
    if isinstance(brand, dict):
        brand = brand.get("name", "")

    images_raw = product_ld.get("image", [])
    if isinstance(images_raw, str):
        images_raw = [images_raw]

    offers = product_ld.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}

    price = offers.get("price", "") if isinstance(offers, dict) else ""
    currency = offers.get("priceCurrency", "USD") if isinstance(offers, dict) else "USD"

    extraction = {
        "title": product_ld.get("name", ""),
        "short_description": product_ld.get("description", ""),
        "brand": str(brand or ""),
        "mpn": product_ld.get("sku", product_ld.get("mpn", "")),
        "regular_price": str(price) if price else "",
        "currency": currency,
        "images": [{"url": img, "alt": ""} for img in images_raw if img],
    }
    if not extraction["title"]:
        return None
    return normalize_from_generic(extraction, base_url)


def _parse_heading_desc_blocks(container: Any) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    if container is None:
        return blocks
    for heading_tag in container.find_all(["h2", "h3", "h4"]):
        heading = heading_tag.get_text(" ", strip=True)
        texts: List[str] = []
        for sib in heading_tag.next_siblings:
            if getattr(sib, "name", None) in ("h2", "h3", "h4"):
                break
            if isinstance(sib, str):
                t = sib.strip()
                if t:
                    texts.append(t)
            elif getattr(sib, "name", None):
                t = sib.get_text(" ", strip=True)
                if t:
                    texts.append(t)
        text = " ".join(texts).strip()
        if heading or text:
            blocks.append({
                "heading": heading or None,
                "text": text or None,
                "media": [],
                "align": "left",
            })
    return blocks


def _find_product_h1(soup: BeautifulSoup) -> Any:
    for selector in (
        ".proshow_list_tt h1",
        ".proshow_right h1",
        "[itemprop='name']",
        "main h1",
        "article h1",
    ):
        el = soup.select_one(selector)
        if el:
            return el
    for h1 in soup.find_all("h1"):
        parent_classes = " ".join(h1.find_parent(class_=True).get("class", [])) if h1.find_parent(class_=True) else ""
        if "proshow_pic" in parent_classes or "circlr" in parent_classes:
            continue
        return h1
    return None


def _brand_from_domain(base_url: str) -> str:
    domain = urlparse(base_url).netloc.lower()
    if "belfone" in domain:
        return "BelFone"
    if "getic" in domain:
        return ""
    parts = domain.replace("www.", "").split(".")
    if parts:
        return parts[0].capitalize()
    return ""


def try_parse_generic_html(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    soup = BeautifulSoup(content, "html.parser")

    title = ""
    title_extended = ""
    h1 = _find_product_h1(soup)
    if h1:
        span = h1.find("span")
        if span:
            span_text = span.get_text(" ", strip=True)
            title = h1.get_text(" ", strip=True).replace(span_text, "").strip()
            title_extended = f"{title} {span_text}".strip() if span_text else title
        else:
            title = h1.get_text(" ", strip=True)
    if not title:
        title_tag = soup.find("title")
        if title_tag:
            title = _clean_page_title(title_tag.get_text(" ", strip=True))

    meta_desc = soup.find("meta", attrs={"name": "description"})
    short_description = meta_desc.get("content", "").strip() if meta_desc else ""
    short_el = soup.select_one(".proshow_list_txt, [itemprop='description'], .product-description")
    if short_el:
        short_description = short_el.get_text(" ", strip=True) or short_description

    brand = ""
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        brand = og_site["content"].strip()
    if not brand:
        brand = _brand_from_domain(base_url)

    slug = ""
    canonical = soup.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        slug = urlparse(canonical["href"]).path.rstrip("/").split("/")[-1]

    images: List[Dict[str, str]] = []
    seen_urls: Set[str] = set()
    for img in soup.select(
        ".proshow_pic img, .proshow_img img, .proshow_top img, "
        "[itemprop='image'], .product-gallery img, .gallery img"
    ):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if not src or _is_skip_image(src):
            continue
        url = make_absolute_url(src, base_url)
        if url and url not in seen_urls:
            seen_urls.add(url)
            images.append({"url": url, "alt": img.get("alt", "")})

    og_img = soup.find("meta", property="og:image")
    if og_img and og_img.get("content"):
        url = make_absolute_url(og_img["content"], base_url)
        if url and url not in seen_urls:
            seen_urls.add(url)
            images.insert(0, {"url": url, "alt": title})

    specifications: List[Dict[str, Any]] = []
    for bf_list in soup.select(".bf_list"):
        tech_el = bf_list.select_one(".bf_list_txt")
        tech = tech_el.get_text(" ", strip=True) if tech_el else "General"
        items: List[Dict[str, Any]] = []
        for row in bf_list.select("table tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                name = cells[0].get_text("\n", strip=True)
                value = cells[1].get_text("\n", strip=True)
                if name and value:
                    items.append({"name": name, "value": value, "canonicalUid": None})
        if items:
            specifications.append({"technology": tech, "items": items})

    if not specifications:
        for table in soup.select("table"):
            if table.find_parent(class_="bf_list"):
                continue
            items = []
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    name = cells[0].get_text("\n", strip=True)
                    value = cells[1].get_text("\n", strip=True)
                    if name and value and name.lower() not in ("name", "feature", "specification"):
                        items.append({"name": name, "value": value, "canonicalUid": None})
            if len(items) >= 2:
                specifications.append({"technology": "General", "items": items})

    desc_blocks = _parse_heading_desc_blocks(
        soup.select_one("#Highlights .dmr_text, .dmr_text, .product-details, .product-content")
    )
    if short_description and not desc_blocks:
        desc_blocks.append({
            "heading": "Overview",
            "text": short_description,
            "media": [],
            "align": "left",
        })

    files: List[Dict[str, str]] = []
    seen_files: Set[str] = set()
    for anchor in soup.select("a[download], .download_con a, a[href$='.pdf']"):
        href = anchor.get("href")
        if not href or not href.strip():
            continue
        url = make_absolute_url(href, base_url)
        if not url or url in seen_files:
            continue
        if ".pdf" not in url.lower() and not anchor.get("download"):
            continue
        seen_files.add(url)
        files.append({
            "title": anchor.get("download") or anchor.get_text(" ", strip=True) or Path(href).name,
            "url": url,
        })

    mpn = title.split()[0] if title else ""
    meta_kw = soup.find("meta", attrs={"name": "keywords"})
    if meta_kw and meta_kw.get("content"):
        for part in meta_kw["content"].split(","):
            part = part.strip()
            if not part or len(part) > 32:
                continue
            if re.match(r"^[A-Za-z]{1,4}[-_][A-Za-z0-9]+$", part):
                mpn = part
                break

    if not title and not short_description and not images:
        return None

    extraction = {
        "title": title,
        "title_extended": title_extended,
        "short_description": short_description,
        "brand": brand,
        "mpn": mpn,
        "slug": slug,
        "images": images,
        "files": files,
        "specifications": specifications,
        "desc_blocks": desc_blocks,
    }
    return normalize_from_generic(extraction, base_url)


# ---------------------------------------------------------------------------
# Ubiquiti UniFi store (store.ui.com / __NEXT_DATA__)
# ---------------------------------------------------------------------------

UNIFI_STORE_MARKERS = (
    "assets.ecomm.ui.com",
    "cdn.ecomm.ui.com",
    "store.ui.com",
    "__next_data__",
    "sc-pr5ovy-5",
)


def _is_unifi_store_html(content: str) -> bool:
    lower = content.lower()
    return any(marker in lower for marker in UNIFI_STORE_MARKERS)


def _extract_next_data(content: str) -> Optional[Dict[str, Any]]:
    match = re.search(
        r'<script\s+id="__NEXT_DATA__"\s+type="application/json">(.*?)</script>',
        content,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def _unifi_decode_image_url(url: str) -> str:
    """Resolve images.svc.ui.com proxy URLs to the underlying CDN asset."""
    if not url:
        return ""
    if "images.svc.ui.com" in url and "u=" in url:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        raw = params.get("u", [""])[0]
        if raw:
            return unquote(raw)
    return url


def _unifi_money_to_decimal(money: Optional[Dict[str, Any]]) -> Tuple[str, str]:
    if not isinstance(money, dict):
        return "", "USD"
    amount = money.get("amount")
    currency = str(money.get("currency") or "USD")
    if amount is None:
        return "", currency
    try:
        return str(int(amount) / 100), currency
    except (TypeError, ValueError):
        return str(amount), currency


def _unifi_poster_from_data(data: Dict[str, Any]) -> str:
    for child in _as_list(data.get("childAssets")):
        if not isinstance(child, dict):
            continue
        mime = str(child.get("mimeType") or "")
        url = _unifi_decode_image_url(str(child.get("url") or ""))
        if url and "image" in mime.lower():
            return url
    return _unifi_decode_image_url(str(data.get("thumbnailUrl") or ""))


UNIFI_MEDIA_KEYS = (
    "gallery",
    "productFeatureMedia",
    "performanceMedia",
    "installationMedia",
    "deploymentMedia",
    "topologyMedia",
    "whatsInTheBoxMedia",
    "techSpecsMedia",
    "modelMedia",
)


def _unifi_collect_item_media(
    item: Dict[str, Any],
    alt: str = "",
    source: str = "",
) -> Dict[str, List[Dict[str, Any]]]:
    images: List[Dict[str, Any]] = []
    videos: List[Dict[str, Any]] = []
    data = _as_dict(item.get("data"))
    url = _unifi_decode_image_url(str(data.get("url") or ""))
    if not url or not url.startswith("http"):
        return {"images": images, "videos": videos}
    item_id = str(item.get("id") or "")
    mime = str(data.get("mimeType") or "").lower()
    lower_url = url.lower()
    extra = {"id": item_id, "source": source} if item_id or source else {}
    if "video" in mime or lower_url.endswith(".mp4"):
        entry: Dict[str, Any] = {"url": url, "type": "upload", **extra}
        poster = _unifi_poster_from_data(data)
        if poster:
            entry["poster"] = poster
        # childAssets videos are alternate encodings of the same clip — do not emit as
        # separate gallery/installation entries (that stacks duplicate players on the PDP).
        videos.append(entry)
        return {"images": images, "videos": videos}
    if "image" not in mime and not lower_url.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")):
        return {"images": images, "videos": videos}
    images.append({
        "url": url,
        "alt": alt,
        "width": int(data.get("width") or 0),
        "height": int(data.get("height") or 0),
        **extra,
    })
    return {"images": images, "videos": videos}


def _unifi_gallery_assets(gallery: Any, alt: str = "", source: str = "") -> Dict[str, List[Dict[str, Any]]]:
    images: List[Dict[str, Any]] = []
    videos: List[Dict[str, Any]] = []
    seen_img: Set[str] = set()
    seen_vid: Set[str] = set()
    if not isinstance(gallery, dict):
        return {"images": images, "videos": videos}
    for item in _as_list(gallery.get("items")):
        if not isinstance(item, dict):
            continue
        collected = _unifi_collect_item_media(item, alt, source)
        for img in collected["images"]:
            url = img.get("url", "")
            if url and url not in seen_img:
                seen_img.add(url)
                images.append(img)
        for vid in collected["videos"]:
            url = vid.get("url", "")
            if url and url not in seen_vid:
                seen_vid.add(url)
                videos.append(vid)
    return {"images": images, "videos": videos}


def _unifi_index_gallery(gallery: Any, alt: str = "", source: str = "") -> Dict[str, Dict[str, Any]]:
    index: Dict[str, Dict[str, Any]] = {}
    if not isinstance(gallery, dict):
        return index
    for item in _as_list(gallery.get("items")):
        if not isinstance(item, dict):
            continue
        item_id = str(item.get("id") or "")
        if not item_id or item_id in index:
            continue
        collected = _unifi_collect_item_media(item, alt, source)
        if collected["videos"]:
            index[item_id] = {"kind": "video", **collected["videos"][0]}
        elif collected["images"]:
            index[item_id] = {"kind": "image", **collected["images"][0]}
    return index


def _unifi_index_product_media(product: Dict[str, Any], alt: str = "") -> Dict[str, Dict[str, Any]]:
    index: Dict[str, Dict[str, Any]] = {}
    for key in UNIFI_MEDIA_KEYS:
        index.update(_unifi_index_gallery(product.get(key), alt, key))
    return index


def _unifi_gallery_images(gallery: Any, alt: str = "") -> List[Dict[str, Any]]:
    return _unifi_gallery_assets(gallery, alt)["images"]


def _unifi_gallery_videos(gallery: Any) -> List[str]:
    return [v["url"] for v in _unifi_gallery_assets(gallery)["videos"]]


def _unifi_spec_entry_value(entry: Dict[str, Any]) -> str:
    typename = entry.get("__typename", "")
    feature = _as_dict(entry.get("feature"))
    label = str(feature.get("label") or "").strip()
    note = str(entry.get("note") or feature.get("note") or "").strip()

    if typename.endswith("FeatureEntryText"):
        value = str(entry.get("value") or "").strip()
        if note and value:
            return f"{value} ({note})"
        return value or note

    if typename.endswith("FeatureEntryFlag"):
        flag = str(entry.get("flag") or "").strip()
        if flag and flag.lower() not in ("empty", "none", "false"):
            return flag
        return label if flag and flag.lower() not in ("empty",) else ""

    if typename.endswith("FeatureEntryBoolean"):
        if entry.get("value") is True:
            return "Yes"
        if entry.get("value") is False:
            return "No"
        return ""

    value = entry.get("value")
    if value is not None and str(value).strip():
        return str(value).strip()
    return ""


def _unifi_parse_specifications(tech_spec: Any) -> List[Dict[str, Any]]:
    if not isinstance(tech_spec, dict):
        return []
    specifications: List[Dict[str, Any]] = []
    for section in _as_list(tech_spec.get("sections")):
        if not isinstance(section, dict):
            continue
        section_meta = _as_dict(section.get("section"))
        tech = str(section_meta.get("label") or "General").strip() or "General"
        items: List[Dict[str, Any]] = []
        group_labels: Dict[str, str] = {}
        for entry in _as_list(section.get("features")):
            if not isinstance(entry, dict):
                continue
            feature = _as_dict(entry.get("feature"))
            name = str(feature.get("label") or "").strip()
            fid = str(feature.get("id") or "")
            typename = str(entry.get("__typename") or "")
            if typename.endswith("FeatureGroup"):
                if name:
                    items.append({
                        "name": name,
                        "value": "",
                        "canonicalUid": None,
                        "is_group": True,
                    })
                    if fid:
                        group_labels[fid] = name
                continue
            value = _unifi_spec_entry_value(entry)
            if not name or not value:
                continue
            item: Dict[str, Any] = {"name": name, "value": value, "canonicalUid": None}
            parent = group_labels.get(str(feature.get("parentId") or ""), "")
            if parent:
                item["parent"] = parent
            items.append(item)
        if items:
            specifications.append({"technology": tech, "items": items})
    return specifications


def _unifi_html_to_text(html_fragment: str) -> str:
    if not html_fragment:
        return ""
    soup = BeautifulSoup(html_fragment, "html.parser")
    return soup.get_text(" ", strip=True)


def _unifi_html_to_feature_text(html_fragment: str) -> str:
    """Convert UniFi keyFeatures HTML into a plain-text bullet list."""
    if not html_fragment:
        return ""
    soup = BeautifulSoup(html_fragment, "html.parser")
    lines: List[str] = []
    for el in soup.find_all(["p", "li"]):
        text = el.get_text(" ", strip=True)
        if text:
            lines.append(f"• {text}")
    if lines:
        return "\n".join(lines)
    return _unifi_html_to_text(html_fragment)


def _desc_text_for_output(text: str) -> str:
    """Ensure description block text is plain text, not raw HTML markup."""
    if not text or not re.search(r"<[a-z]", text, re.I):
        return text
    if text.count("<p") > 1 or "key-features" in text:
        return _unifi_html_to_feature_text(text)
    return _unifi_html_to_text(text)


def _unifi_parse_model_media(
    model_media: Any,
    variants: List[Any],
) -> Optional[Dict[str, Any]]:
    if not isinstance(model_media, dict):
        return None
    items = _as_list(model_media.get("items"))
    if not items or not isinstance(items[0], dict):
        return None
    data = _as_dict(items[0].get("data"))
    url = str(data.get("url") or "").strip()
    mime = str(data.get("mimeType") or "").lower()
    if not url:
        return None
    if "model" not in mime and not url.lower().endswith((".glb", ".gltf")):
        return None

    variant_by_id = {
        str(v.get("id")): v
        for v in variants
        if isinstance(v, dict) and v.get("id")
    }
    out_variants: List[Dict[str, Any]] = []
    for mvs in _as_list(data.get("modelVariantSettings")):
        if not isinstance(mvs, dict):
            continue
        setting = _as_dict(mvs.get("setting"))
        used_by = _as_list(mvs.get("usedBy"))
        color = str(setting.get("name") or "").strip()
        sku = ""
        if used_by:
            vid = str(_as_dict(used_by[0]).get("variantId") or "")
            linked = variant_by_id.get(vid, {})
            sku = str(linked.get("sku") or linked.get("displaySku") or "")
            if linked.get("title"):
                color = str(linked.get("title"))
        thumb = _as_dict(setting.get("thumbnail"))
        out_variants.append({
            "color": color,
            "sku": sku,
            "thumbnail": _unifi_decode_image_url(str(thumb.get("url") or "")),
            "camera": {
                "fov": setting.get("cameraFov"),
                "phi": setting.get("cameraPhi"),
                "theta": setting.get("cameraTheta"),
                "radius": setting.get("cameraRadius"),
                "brightness": setting.get("sceneBrightness"),
            },
            "ar": {
                "enabled": bool(setting.get("arEnabled")),
                "placement": setting.get("arPlacement"),
                "roll": setting.get("arOrientationRoll"),
                "pitch": setting.get("arOrientationPitch"),
                "yaw": setting.get("arOrientationYaw"),
            },
        })
    return {"enabled": True, "url": url, "variants": out_variants}


def _unifi_parse_feature_media(
    gallery: Any,
    url_colors: Optional[Dict[str, str]] = None,
    url_attrs: Optional[Dict[str, Dict[str, str]]] = None,
) -> List[Dict[str, Any]]:
    features: List[Dict[str, Any]] = []
    if not isinstance(gallery, dict):
        return features
    url_colors = url_colors or {}
    url_attrs = url_attrs or {}
    for item in _as_list(gallery.get("items")):
        if not isinstance(item, dict):
            continue
        data = _as_dict(item.get("data"))
        fv = _as_dict(data.get("featureValues"))
        title = str(fv.get("title") or "").strip()
        body = _unifi_html_to_text(str(fv.get("body") or ""))
        image = _unifi_decode_image_url(str(data.get("url") or ""))
        if not title and not image:
            continue
        hotspot: Dict[str, Any] = {}
        for key in (
            "dotX", "dotY", "tooltipX", "tooltipY",
            "lineRenderType", "scale", "canvasWidth", "canvasHeight",
        ):
            if fv.get(key) is not None:
                hotspot[key] = fv.get(key)
        feature: Dict[str, Any] = {
            "title": title,
            "body": body,
            "image": image,
            "hotspot": hotspot,
        }
        color = url_colors.get(image, "")
        if color:
            feature["color"] = color
        attrs = dict(url_attrs.get(image) or {})
        if color:
            attrs.setdefault("Color", color)
        if attrs:
            feature["attributes"] = attrs
        features.append(feature)
    return features


def _unifi_option_catalog(product: Dict[str, Any]) -> Tuple[Dict[str, Tuple[str, str]], List[Dict[str, Any]]]:
    by_id: Dict[str, Tuple[str, str]] = {}
    dims: List[Dict[str, Any]] = []
    for option in _as_list(product.get("options")):
        if not isinstance(option, dict):
            continue
        type_title = str(option.get("title") or option.get("slug") or "").strip() or "Option"
        values: List[str] = []
        for value in _as_list(option.get("values")):
            if not isinstance(value, dict) or not value.get("id"):
                continue
            label = str(value.get("title") or "").strip()
            if not label:
                continue
            by_id[str(value.get("id"))] = (type_title, label)
            if label not in values:
                values.append(label)
        if values:
            dims.append({"type": type_title, "options": values})
    return by_id, dims


def _unifi_variant_attributes(
    variant: Dict[str, Any],
    option_by_id: Dict[str, Tuple[str, str]],
) -> Dict[str, str]:
    attributes: Dict[str, str] = {}
    for oid in _as_list(variant.get("optionValueIds")):
        mapped = option_by_id.get(str(oid))
        if not mapped:
            continue
        type_title, label = mapped
        if type_title and label:
            attributes[type_title] = label
    if not any(k.lower() in ("color", "colour") for k in attributes):
        title = str(variant.get("title") or "").strip()
        if title:
            attributes["Color"] = title
    return attributes


def _color_from_attributes(attributes: Dict[str, str]) -> str:
    for key, value in attributes.items():
        if key.lower() in ("color", "colour") and value:
            return value
    return ""


def _unifi_color_variants(
    product: Dict[str, Any],
    media_index: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    option_by_id, _dims = _unifi_option_catalog(product)
    media_index = media_index or {}
    variants_out: List[Dict[str, Any]] = []
    for variant in _as_list(product.get("variants")):
        if not isinstance(variant, dict):
            continue
        attributes = _unifi_variant_attributes(variant, option_by_id)
        color = _color_from_attributes(attributes)
        price, currency = _unifi_money_to_decimal(_as_dict(variant.get("displayPrice")))
        status = str(variant.get("status") or "")
        image_ids = [str(i) for i in _as_list(variant.get("galleryItemIds")) if i]
        images: List[Dict[str, Any]] = []
        videos: List[Dict[str, Any]] = []
        seen_img: Set[str] = set()
        seen_vid: Set[str] = set()
        for iid in image_ids:
            entry = media_index.get(iid)
            if not entry:
                continue
            url = str(entry.get("url") or "")
            if not url:
                continue
            payload = {k: v for k, v in entry.items() if k != "kind"}
            if attributes:
                payload["attributes"] = dict(attributes)
            if color:
                payload["color"] = color
                payload["alt"] = payload.get("alt") or color
            if entry.get("kind") == "video":
                if url not in seen_vid:
                    seen_vid.add(url)
                    videos.append(payload)
            elif url not in seen_img:
                seen_img.add(url)
                images.append(payload)
        variants_out.append({
            "color": color,
            "attributes": attributes,
            "sku": str(variant.get("sku") or variant.get("displaySku") or ""),
            "slug": str(variant.get("slug") or ""),
            "price": price,
            "currency": currency,
            "stock": 3 if status.lower() == "available" else 0,
            "image_ids": image_ids,
            "images": images,
            "videos": videos,
        })
    return variants_out


def _unifi_build_desc_blocks(
    product: Dict[str, Any],
    alt: str,
    model_3d: Optional[Dict[str, Any]] = None,
    feature_hotspots: Optional[List[Dict[str, Any]]] = None,
    url_colors: Optional[Dict[str, str]] = None,
    url_attrs: Optional[Dict[str, Dict[str, str]]] = None,
) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    url_colors = url_colors or {}
    url_attrs = url_attrs or {}

    def _attach_variation(entry: Dict[str, Any], url: str) -> Dict[str, Any]:
        attrs = dict(entry.get("attributes") or url_attrs.get(url) or {})
        color = str(entry.get("color") or attrs.get("Color") or attrs.get("Colour") or url_colors.get(url) or "")
        if color:
            entry["color"] = color
            attrs.setdefault("Color", color)
        if attrs:
            entry["attributes"] = attrs
        return entry

    def _media_payload(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        payload: List[Dict[str, Any]] = []
        for m in items:
            url = str(m.get("url") or "")
            entry = {
                "url": m["url"],
                "alt": m.get("alt", alt),
                "width": m.get("width", 0),
                "height": m.get("height", 0),
            }
            payload.append(_attach_variation(entry, url))
        return payload

    def _video_payload(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        payload: List[Dict[str, Any]] = []
        for v in items:
            entry = {k: val for k, val in v.items() if k not in ("id", "source")}
            url = str(entry.get("url") or "")
            if not entry.get("color"):
                entry["color"] = url_colors.get(url, "") or url_colors.get(str(entry.get("poster") or ""), "")
            payload.append(_attach_variation(entry, url or str(entry.get("poster") or "")))
        return payload

    key_features = str(product.get("keyFeatures") or "").strip()
    if key_features:
        blocks.append({
            "heading": "Key Features",
            "text": _unifi_html_to_feature_text(key_features),
            "media": [],
            "videos": [],
            "features": feature_hotspots or [],
            "align": "left",
            "tab": "overview",
        })

    overview_images: List[Dict[str, Any]] = []
    overview_videos: List[Dict[str, Any]] = []
    for media_key in ("productFeatureMedia", "deploymentMedia"):
        assets = _unifi_gallery_assets(product.get(media_key), alt)
        overview_images.extend(assets["images"])
        overview_videos.extend(assets["videos"])
    if overview_images or overview_videos:
        blocks.append({
            "heading": "Overview",
            "text": None,
            "media": _media_payload(overview_images),
            "videos": _video_payload(overview_videos),
            "features": [],
            "align": "center",
            "tab": "overview",
        })

    for media_key, heading, tab in (
        ("topologyMedia", "Topology", "overview"),
        ("performanceMedia", "Performance", "overview"),
        ("techSpecsMedia", "Technical Highlights", "technical"),
        ("installationMedia", "Installation Tutorial", "installation"),
        ("whatsInTheBoxMedia", "In The Box", "in_the_box"),
    ):
        assets = _unifi_gallery_assets(product.get(media_key), alt)
        if assets["images"] or assets["videos"]:
            blocks.append({
                "heading": heading,
                "text": None,
                "media": _media_payload(assets["images"]),
                "videos": _video_payload(assets["videos"]),
                "features": [],
                "align": "center",
                "tab": tab,
            })

    if model_3d and model_3d.get("url"):
        thumbs = [
            {
                "url": v["thumbnail"],
                "alt": v.get("color") or alt,
                "width": 0,
                "height": 0,
                "color": v.get("color") or "",
            }
            for v in _as_list(model_3d.get("variants"))
            if v.get("thumbnail")
        ]
        blocks.append({
            "heading": "3D Model",
            "text": None,
            "media": thumbs,
            "videos": [],
            "features": [],
            "align": "center",
            "tab": "3d",
            "model_3d": model_3d,
        })

    return blocks


def _unifi_map_related_products(items: List[Any], currency: str) -> List[Dict[str, Any]]:
    mapped: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        variants = _as_list(item.get("variants"))
        if not variants:
            continue
        variant = variants[0]
        price, item_currency = _unifi_money_to_decimal(_as_dict(variant.get("displayPrice")))
        status = str(variant.get("status") or "")
        mapped.append({
            "name": item.get("shortTitle") or item.get("title") or "",
            "url": f"/product/{item.get('slug', '')}",
            "price": float(price) if price else None,
            "currency": item_currency or currency,
            "mpn": variant.get("sku") or variant.get("displaySku") or "",
            "availability": "InStock" if status.lower() == "available" else "OutOfStock",
        })
    return mapped


def _unifi_pick_product(page_props: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    collection = _as_dict(page_props.get("collection"))
    products = _as_list(collection.get("products"))
    if not products:
        return None
    current_id = str(page_props.get("currentProductId") or "")
    if current_id:
        for product in products:
            if isinstance(product, dict) and str(product.get("id") or "") == current_id:
                return product
    first = products[0]
    return first if isinstance(first, dict) else None


def _unifi_default_variant(product: Dict[str, Any]) -> Dict[str, Any]:
    variants = _as_list(product.get("variants"))
    for variant in variants:
        if isinstance(variant, dict) and variant.get("defaultSku"):
            return variant
    if variants and isinstance(variants[0], dict):
        return variants[0]
    return {}


def _unifi_color_options(product: Dict[str, Any]) -> List[str]:
    colors: List[str] = []
    for option in _as_list(product.get("options")):
        if not isinstance(option, dict):
            continue
        title = str(option.get("title") or option.get("slug") or "").lower()
        if "color" not in title:
            continue
        for value in _as_list(option.get("values")):
            if isinstance(value, dict):
                label = str(value.get("title") or "").strip()
                if label:
                    colors.append(label)
    return colors


def _normalize_from_unifi_product(
    product: Dict[str, Any],
    page_props: Dict[str, Any],
    base_url: str,
) -> Dict[str, Any]:
    variant = _unifi_default_variant(product)
    alt = str(product.get("shortTitle") or product.get("title") or "")

    media_index = _unifi_index_product_media(product, alt)
    color_variants = _unifi_color_variants(product, media_index)
    color_options = [v["color"] for v in color_variants if v.get("color")]
    if not color_options:
        color_options = _unifi_color_options(product)

    default_sku = str(variant.get("sku") or variant.get("displaySku") or "")
    default_cv: Dict[str, Any] = {}
    if color_variants:
        default_cv = next(
            (cv for cv in color_variants if default_sku and cv.get("sku") == default_sku),
            color_variants[0],
        )
    default_color = str(default_cv.get("color") or (color_options[0] if color_options else ""))

    assigned_ids: Set[str] = set()
    url_colors: Dict[str, str] = {}
    url_attrs: Dict[str, Dict[str, str]] = {}
    for cv in color_variants:
        assigned_ids.update(str(i) for i in (cv.get("image_ids") or []))
        color = str(cv.get("color") or "")
        attrs = dict(cv.get("attributes") or {})
        if color:
            attrs.setdefault("Color", color)
        for img in cv.get("images") or []:
            url = str(img.get("url") or "")
            if url and color:
                url_colors[url] = color
            if url and attrs:
                url_attrs[url] = dict(attrs)
        for vid in cv.get("videos") or []:
            url = str(vid.get("url") or "")
            if url and color:
                url_colors[url] = color
            if url and attrs:
                url_attrs[url] = dict(attrs)

    gallery_assets = _unifi_gallery_assets(product.get("gallery"), alt, "gallery")
    images: List[Dict[str, Any]] = []
    seen_img: Set[str] = set()

    def _append_image(img: Dict[str, Any], color: str = "") -> None:
        url = str(img.get("url") or "")
        if not url or url in seen_img:
            return
        seen_img.add(url)
        entry = {k: v for k, v in img.items() if k not in ("id", "source")}
        resolved_color = color or url_colors.get(url) or str(entry.get("color") or "")
        if resolved_color:
            entry["color"] = resolved_color
            entry["alt"] = entry.get("alt") or resolved_color
        attrs = dict(entry.get("attributes") or url_attrs.get(url) or {})
        if resolved_color:
            attrs.setdefault("Color", resolved_color)
        if attrs:
            entry["attributes"] = attrs
        images.append(entry)

    ordered_variants = sorted(
        color_variants,
        key=lambda cv: 0 if str(cv.get("color") or "") == default_color else 1,
    )
    for cv in ordered_variants:
        for img in cv.get("images") or []:
            if img.get("source") and img.get("source") != "gallery":
                continue
            _append_image(img, str(cv.get("color") or ""))

    for img in gallery_assets["images"]:
        iid = str(img.get("id") or "")
        if iid and iid in assigned_ids:
            continue
        _append_image(img, url_colors.get(str(img.get("url") or ""), ""))

    thumb = _as_dict(product.get("thumbnail"))
    thumb_url = _unifi_decode_image_url(str(thumb.get("url") or ""))
    if thumb_url and thumb_url not in seen_img and not any(
        img.get("color") == default_color for img in images if default_color
    ):
        images.insert(0, {
            "url": thumb_url,
            "alt": default_color or alt,
            "width": 0,
            "height": 0,
            **({"color": default_color} if default_color else {}),
        })
        seen_img.add(thumb_url)

    videos: List[Dict[str, Any]] = list(gallery_assets["videos"])
    for media_key in (
        "productFeatureMedia", "performanceMedia", "installationMedia",
        "deploymentMedia", "topologyMedia", "whatsInTheBoxMedia", "techSpecsMedia",
    ):
        videos.extend(_unifi_gallery_assets(product.get(media_key), alt, media_key)["videos"])
    other_video_urls: Set[str] = set()
    default_video_urls: Set[str] = set()
    for cv in color_variants:
        urls = {str(v.get("url") or "") for v in (cv.get("videos") or []) if v.get("url")}
        if cv.get("color") == default_color:
            default_video_urls |= urls
        else:
            other_video_urls |= urls
    exclusive_other_videos = other_video_urls - default_video_urls
    seen_vid: Set[str] = set()
    unique_videos: List[Dict[str, Any]] = []
    for vid in videos:
        url = vid.get("url", "")
        if not url or url in seen_vid or url in exclusive_other_videos:
            continue
        seen_vid.add(url)
        entry = {k: v for k, v in vid.items() if k not in ("id", "source")}
        color = entry.get("color") or url_colors.get(url, "")
        if color:
            entry["color"] = color
        attrs = dict(entry.get("attributes") or url_attrs.get(url) or {})
        if color:
            attrs.setdefault("Color", color)
        if attrs:
            entry["attributes"] = attrs
        unique_videos.append(entry)

    files: List[Dict[str, str]] = []
    doc_titles = {
        "InstallationGuide": "Installation Guide",
        "QuickStartGuide": "Quick Start Guide",
        "Datasheet": "Datasheet",
        "UserManual": "User Manual",
    }
    for doc in _as_list(product.get("documents")):
        if not isinstance(doc, dict):
            continue
        url = str(doc.get("url") or "").strip()
        if not url:
            continue
        doc_type = str(doc.get("type") or "Document")
        files.append({"title": doc_titles.get(doc_type, doc_type), "url": url})

    price, currency = _unifi_money_to_decimal(_as_dict(variant.get("displayPrice")))
    if not price:
        price, currency = _unifi_money_to_decimal({
            "amount": product.get("minDisplayPrice"),
            "currency": currency or "USD",
        })

    inline = _as_dict(page_props.get("inlineAdditions"))
    related = (
        _as_list(inline.get("inlineRelatedProducts"))
        + _as_list(inline.get("customizationProducts"))
    )

    manufacturer = str(product.get("manufacturer") or "Ubiquiti").strip() or "Ubiquiti"
    mpn = str(
        variant.get("sku")
        or variant.get("displaySku")
        or product.get("displaySku")
        or product.get("name")
        or ""
    ).strip()

    status = str(variant.get("status") or product.get("status") or "")
    stock = 3 if status.lower() == "available" else 0

    short_description = _unifi_html_to_text(str(product.get("description") or ""))
    if not short_description:
        short_description = str(product.get("shortDescription") or product.get("seoDescription") or "").strip()

    specifications = _unifi_parse_specifications(product.get("technicalSpecification"))
    if color_options:
        specifications.append({
            "technology": "Options",
            "items": [{"name": "Color", "value": ", ".join(color_options), "canonicalUid": None}],
        })

    model_3d = _unifi_parse_model_media(product.get("modelMedia"), _as_list(product.get("variants")))
    feature_hotspots = _unifi_parse_feature_media(product.get("productFeatureMedia"), url_colors, url_attrs)

    category = _as_dict(page_props.get("category"))
    breadcrumbs = []
    for crumb in _as_list(category.get("breadcrumbs")):
        if isinstance(crumb, dict) and crumb.get("title"):
            breadcrumbs.append({
                "title": crumb.get("title"),
                "slug": crumb.get("productSlug") or "",
            })

    extraction = {
        "id": str(product.get("id") or ""),
        "uid": str(product.get("slug") or product.get("id") or mpn),
        "title": str(product.get("shortTitle") or product.get("title") or "").strip(),
        "title_extended": str(product.get("title") or "").strip(),
        "short_description": short_description,
        "brand": manufacturer,
        "mpn": mpn,
        "regular_price": price,
        "currency": currency,
        "stock": stock,
        "images": images,
        "files": files,
        "specifications": specifications,
        "desc_blocks": _unifi_build_desc_blocks(product, alt, model_3d, feature_hotspots, url_colors, url_attrs),
        "bought_together": _unifi_map_related_products(related, currency),
        "videos": unique_videos,
        "cat_leaf": str(product.get("family") or product.get("type") or "").strip(),
        "has_3d_model": bool(model_3d and model_3d.get("url")),
        "model_3d": model_3d,
        "color_variants": color_variants,
        "available_colors": color_options,
        "default_color": default_color,
        "breadcrumbs": breadcrumbs,
        "compare_product_ids": _as_list(category.get("compareProductIds")),
        "output_format": "unifi",
    }

    tags = [
        str(tag.get("name") or "")
        for tag in _as_list(product.get("tags"))
        if isinstance(tag, dict) and tag.get("name")
    ]
    if tags:
        extraction["tags"] = tags

    return normalize_from_generic(extraction, base_url)


def try_parse_unifi_next_data(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    data = _extract_next_data(content)
    if not data:
        return None
    page_props = _as_dict(_as_dict(data.get("props")).get("pageProps"))
    product = _unifi_pick_product(page_props)
    if not product:
        return None
    return _normalize_from_unifi_product(product, page_props, base_url)


def _unifi_parse_price_text(text: str) -> str:
    if not text:
        return ""
    match = re.search(r"([\d][\d.,]*)", text.replace("\u200f", "").replace("\u200e", ""))
    if not match:
        return ""
    raw = match.group(1).replace(",", "")
    try:
        return str(float(raw))
    except ValueError:
        return raw


def try_parse_unifi_dom(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    """Parse static UniFi layout HTML (sample pages without __NEXT_DATA__)."""
    soup = BeautifulSoup(content, "html.parser")

    title = ""
    for selector in (".sc-pr5ovy-5", "[class*='pr5ovy-5']"):
        el = soup.select_one(selector)
        if el:
            title = el.get_text(" ", strip=True)
            break
    if not title:
        title_tag = soup.find("title")
        if title_tag:
            title = _clean_page_title(title_tag.get_text(" ", strip=True))
            title = re.sub(r"^Access Point\s+", "", title, flags=re.I).strip()

    mpn = ""
    for selector in (".sc-pr5ovy-7", "[class*='pr5ovy-7']"):
        el = soup.select_one(selector)
        if el:
            mpn = el.get_text(" ", strip=True)
            break

    price = ""
    for selector in (".sc-pr5ovy-14", ".sc-y2swsu-4", "[class*='pr5ovy-14']"):
        el = soup.select_one(selector)
        if el:
            price = _unifi_parse_price_text(el.get_text(" ", strip=True))
            if price:
                break

    short_description = ""
    for selector in (".sc-14cjdti-2", "[class*='14cjdti-2']"):
        el = soup.select_one(selector)
        if el:
            short_description = el.get_text(" ", strip=True)
            break

    images: List[Dict[str, str]] = []
    seen: Set[str] = set()
    for img in soup.find_all("img"):
        for attr in ("src", "data-src"):
            src = img.get(attr) or ""
            if not src:
                continue
            url = _unifi_decode_image_url(src)
            if "cdn.ecomm.ui.com/products/" not in url:
                continue
            if _is_skip_image(url) or url in seen:
                continue
            seen.add(url)
            images.append({"url": url, "alt": img.get("alt", title)})

    videos: List[Dict[str, Any]] = []
    for video in soup.find_all("video"):
        src = video.get("src") or ""
        if src and "cdn.ecomm.ui.com" in src and all(v.get("url") != src for v in videos):
            videos.append({"url": src, "type": "upload"})

    color_options: List[str] = []
    for button in soup.select(".sc-1uupl4m-8, [class*='1uupl4m-8']"):
        color = (button.get("title") or button.get("aria-label") or "").strip()
        if not color:
            img = button.find("img")
            if img:
                color = (img.get("alt") or "").strip()
        if color and color not in color_options:
            color_options.append(color)

    bought_together: List[Dict[str, Any]] = []
    for card in soup.select(".sc-1gvsp11-8, [class*='1gvsp11-8']"):
        name_el = card.select_one(".sc-1gvsp11-1, [class*='1gvsp11-1']")
        price_el = card.select_one(".sc-1gvsp11-10, [class*='1gvsp11-10']")
        if not name_el:
            continue
        acc_price = _unifi_parse_price_text(price_el.get_text(" ", strip=True) if price_el else "")
        bought_together.append({
            "name": name_el.get_text(" ", strip=True),
            "url": "",
            "price": float(acc_price) if acc_price else None,
            "currency": "",
            "mpn": "",
            "availability": "InStock",
        })

    desc_blocks: List[Dict[str, Any]] = []
    overview_images: List[Dict[str, Any]] = []
    for img in soup.select(".sc-797x8i-0 img, [class*='797x8i-0'] img, .sc-797x8i-1 img"):
        src = img.get("src") or ""
        url = _unifi_decode_image_url(src)
        if url and "cdn.ecomm.ui.com/products/" in url and url not in seen:
            seen.add(url)
            overview_images.append({"url": url, "width": 0, "height": 0})
    if overview_images:
        desc_blocks.append({
            "heading": "Overview",
            "text": None,
            "media": overview_images,
            "videos": [],
            "features": [],
            "align": "center",
            "tab": "overview",
        })

    if not title and not short_description and not images:
        return None

    extraction: Dict[str, Any] = {
        "title": title,
        "title_extended": title,
        "short_description": short_description,
        "brand": "Ubiquiti",
        "mpn": mpn,
        "regular_price": price,
        "currency": "USD",
        "stock": 3 if price else 0,
        "images": images,
        "desc_blocks": desc_blocks,
        "bought_together": bought_together,
        "videos": videos,
    }
    if color_options:
        extraction["specifications"] = [{
            "technology": "Options",
            "items": [{"name": "Color", "value": ", ".join(color_options), "canonicalUid": None}],
        }]
        extraction["available_colors"] = color_options
        extraction["color_variants"] = [
            {
                "color": c,
                "sku": "",
                "slug": "",
                "price": price,
                "currency": "USD",
                "stock": 3 if price else 0,
                "image_ids": [],
                "images": [],
                "videos": [],
            }
            for c in color_options
        ]
    extraction["output_format"] = "unifi"

    return normalize_from_generic(extraction, base_url)


def try_parse_unifi_store_html(content: str, base_url: str) -> Optional[Dict[str, Any]]:
    if not _is_unifi_store_html(content):
        return None
    result = try_parse_unifi_next_data(content, base_url)
    if result is not None:
        return result
    return try_parse_unifi_dom(content, base_url)


def load_and_normalize(input_path: Path, force_json: bool = False) -> Tuple[Dict[str, Any], str]:
    content = read_file_text(input_path)
    if force_json or detect_input_format(content) == "json":
        return normalize_from_json(json.loads(content)), "raw_json"

    base_url = resolve_page_base_url(content)
    parsers: List[Tuple[str, Any]] = [
        ("getic_vike", try_parse_getic_vike_context),
        ("unifi_store", try_parse_unifi_store_html),
        ("json_ld", try_parse_json_ld_product),
        ("generic_html", try_parse_generic_html),
    ]
    tried: List[str] = []
    for name, parser in parsers:
        tried.append(name)
        result = parser(content, base_url)
        if result is not None:
            return result, name

    raise ValueError(
        f"Could not extract product data from {input_path.name} "
        f"(tried parsers: {', '.join(tried)})"
    )


# ---------------------------------------------------------------------------
# Description HTML builder
# ---------------------------------------------------------------------------

def _svg_icon(name: str, color: str = "currentColor", size: int = 18) -> str:
    """Return compact inline SVG for WooCommerce-safe icons (no external assets)."""
    s = size
    icons = {
        "chevron": (
            f'<svg class="gd-chevron-svg" xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" '
            f'viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.5" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<polyline points="6 9 12 15 18 9"/></svg>'
        ),
        "doc": (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
            f'<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>'
            f'<line x1="16" y1="17" x2="8" y2="17"/></svg>'
        ),
        "specs": (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'
            f'<line x1="9" y1="21" x2="9" y2="9"/></svg>'
        ),
        "download": (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
            f'<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
        ),
        "file": (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>'
            f'<polyline points="13 2 13 9 20 9"/></svg>'
        ),
        "external": (
            f'<svg class="gd-ext-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
            f'<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
        ),
        "overview": (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>'
            f'<line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        ),
    }
    return icons.get(name, "")


def _build_description_css(theme: Optional[Dict[str, str]] = None) -> str:
    """Build scoped product-description stylesheet from DESCRIPTION_THEME."""
    t = {**DESCRIPTION_THEME, **(theme or {})}
    p = t["primary"]
    pd = t["primary_dark"]
    surf = t["surface"]
    border = t["border"]
    text = t["text"]
    muted = t["text_muted"]

    return f"""/* Product description styles for imported products.
   Install once in WordPress: Appearance > Customize > Additional CSS,
   or enqueue this file from your child theme. */
.gd {{
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: {text};
  max-width: 100%;
  -webkit-font-smoothing: antialiased;
}}
.gd-intro {{
  background: linear-gradient(135deg, {p} 0%, {pd} 100%);
  color: #fff;
  padding: 32px 36px;
  border-radius: 12px;
  margin-bottom: 28px;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  transition: transform .2s ease, box-shadow .2s ease;
}}
.gd-intro:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,.12);
}}
.gd-intro-header {{
  display: flex;
  align-items: flex-start;
  gap: 14px;
}}
.gd-intro-icon {{
  flex-shrink: 0;
  opacity: .9;
  margin-top: 2px;
}}
.gd-intro h2 {{
  color: #fff;
  margin: 0 0 10px;
  font-size: 1.5em;
  font-weight: 600;
  letter-spacing: -.01em;
  border: none;
}}
.gd-intro p {{
  margin: 0;
  font-size: 1.05em;
  line-height: 1.65;
  opacity: .95;
}}
.gd details.gd-accordion {{
  background: #fff;
  border: 1px solid {border};
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}}
.gd details.gd-accordion:hover {{
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}}
.gd details.gd-accordion summary {{
  list-style: none;
  padding: 18px 24px;
  background: {surf};
  cursor: pointer;
  font-size: 1.1em;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  user-select: none;
  transition: background .2s ease;
  border-bottom: 1px solid transparent;
}}
.gd details.gd-accordion summary::-webkit-details-marker {{ display: none; }}
.gd details.gd-accordion summary:focus-visible {{
  outline: 2px solid {p};
  outline-offset: -2px;
}}
.gd details.gd-accordion[open] summary {{
  background: #f7f9fc;
  border-bottom-color: {border};
}}
.gd details.gd-accordion summary:hover {{ background: #f5f7fa; }}
.gd-summary-inner {{
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}}
.gd-summary-icon {{
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: {p};
}}
.gd-summary-label {{ line-height: 1.3; }}
.gd-chevron {{
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: #6b7280;
  transition: transform .25s ease;
}}
.gd details.gd-accordion[open] .gd-chevron {{ transform: rotate(180deg); }}
.gd-detail-body {{ padding: 24px 28px; background: #fff; }}
.gd-h3 {{
  color: #374151;
  font-size: 1.1em;
  font-weight: 600;
  margin: 24px 0 12px;
  padding-left: 12px;
  border-left: 3px solid {p};
}}
.gd-h3:first-of-type {{ margin-top: 0; }}
.gd-text {{ color: {muted}; }}
.gd-text p {{ margin: 0 0 16px; line-height: 1.75; }}
.gd-text p:last-child {{ margin-bottom: 0; }}
.gd-text ul, .gd-text ol {{ margin: 8px 0 16px 24px; padding: 0; }}
.gd-text li {{ margin-bottom: 8px; line-height: 1.65; }}
.gd-text ul li::marker {{ color: {p}; }}
.gd-text strong {{ color: {text}; font-weight: 600; }}
.gd-text a {{ color: {p}; text-decoration: none; }}
.gd-text a:hover {{ color: {pd}; text-decoration: underline; }}
.gd-text blockquote {{
  margin: 12px 0;
  padding: 12px 16px;
  border-left: 3px solid {p};
  background: {surf};
  color: {muted};
  border-radius: 0 6px 6px 0;
}}
.gd-text input[type="checkbox"] {{ margin-right: 8px; vertical-align: middle; }}
.gd-text > *:first-child {{ margin-top: 0; }}
.gd-text > *:last-child {{ margin-bottom: 0; }}
.gd-table-wrap {{
  overflow-x: auto;
  margin-bottom: 24px;
  -webkit-overflow-scrolling: touch;
}}
.gd-table-wrap .specs-table {{ margin-bottom: 0; }}
.specs-table {{
  display: table;
  width: 100%;
  min-width: 280px;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid {border};
}}
.specs-row {{ display: table-row; transition: background .15s ease; }}
.specs-row:nth-child(even) {{ background: #f9fafb; }}
.specs-row:hover {{ background: #f3f4f6; }}
.specs-table .spec-label,
.specs-table .spec-value {{
  display: table-cell;
  padding: 12px 16px;
  border-bottom: 1px solid {border};
  vertical-align: top;
}}
.specs-row:last-child .spec-label,
.specs-row:last-child .spec-value {{ border-bottom: none; }}
.spec-label {{
  font-weight: 600;
  color: #374151;
  width: 35%;
  background: #f9fafb;
  border-right: 1px solid {border};
}}
.spec-value {{ color: {muted}; }}
.spec-value a {{
  color: {p};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color .15s ease;
}}
.spec-value a:hover {{ color: {pd}; text-decoration: underline; }}
.spec-cat {{
  background: #f3f4f6;
  padding: 10px 16px;
  margin: 20px 0 12px;
  border-radius: 6px;
  font-weight: 600;
  color: #1f2937;
  font-size: .95em;
  border-left: 3px solid {p};
}}
.spec-cat:first-of-type {{ margin-top: 0; }}
.dl-section {{
  background: color-mix(in srgb, {p} 8%, #fff);
  padding: 20px 24px;
  border-radius: 12px;
  margin-top: 24px;
  border: 1px solid color-mix(in srgb, {p} 25%, {border});
  transition: background .2s ease, border-color .2s ease;
}}
.dl-section:hover {{
  background: color-mix(in srgb, {p} 12%, #fff);
  border-color: color-mix(in srgb, {p} 40%, {border});
}}
.dl-section-header {{
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}}
.dl-section-header .gd-h3 {{
  margin: 0;
  flex: 1;
}}
.dl-section-icon {{ color: {p}; display: flex; flex-shrink: 0; }}
.dl-list {{ list-style: none; padding: 0; margin: 12px 0 0; }}
.gd-dl-item {{
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  margin-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, {p} 15%, {border});
}}
.gd-dl-item:last-child {{ border-bottom: none; margin-bottom: 0; }}
.gd-dl-icon {{
  flex-shrink: 0;
  color: {p};
  margin-top: 2px;
  display: flex;
}}
.dl-list a {{
  color: {p};
  text-decoration: none;
  font-weight: 500;
  line-height: 1.5;
  transition: color .15s ease;
}}
.dl-list a:hover {{ color: {pd}; text-decoration: underline; }}
.gd-figure {{
  margin: 20px 0;
  text-align: left;
}}
.gd-figure--center {{ text-align: center; }}
.gd-figure img {{
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,.08);
  display: block;
}}
.gd-figure--center img {{ margin-left: auto; margin-right: auto; }}
.gd-video {{
  margin: 20px 0;
  width: 100%;
  border-radius: 8px;
  background: #0f172a;
}}
.gd-video video {{
  display: block;
  width: 100%;
  max-height: 480px;
  border-radius: 8px;
}}
.gd-features {{
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 16px 0;
}}
.gd-feature {{
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid {border};
  border-radius: 8px;
  background: {surf};
}}
.gd-feature img {{
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}}
.gd-feature h4 {{
  margin: 0 0 6px;
  font-size: 15px;
  color: {text};
}}
.gd-feature p {{
  margin: 0;
  color: {muted};
  font-size: 14px;
}}
.gd-3d {{
  margin: 16px 0;
  padding: 14px 16px;
  border: 1px solid {border};
  border-radius: 8px;
  background: {surf};
}}
.gd-3d a {{ color: {p}; font-weight: 500; }}
.specs-row.specs-group .spec-label {{
  font-weight: 700;
  color: {p};
}}
.specs-row.specs-child .spec-label {{ padding-left: 16px; }}
.gd-callout {{
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 16px 0;
  padding: 14px 16px;
  background: color-mix(in srgb, {p} 6%, {surf});
  border-left: 4px solid {p};
  border-radius: 8px;
}}
.gd-callout-icon {{
  flex-shrink: 0;
  width: auto;
  height: auto;
  max-width: 48px;
  max-height: 48px;
  border-radius: 4px;
}}
.gd-callout-text {{ flex: 1; min-width: 0; color: {muted}; line-height: 1.65; }}
.gd-callout-text p {{ margin: 0; }}
.gd-figure-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin: 20px 0;
}}
.gd-figure-grid .gd-figure {{
  margin: 0;
  text-align: center;
}}
.gd-figure-grid .gd-figure img {{
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  margin: 0 auto;
}}
"""


def _accordion_section(title: str, icon_name: str, body_parts: List[str]) -> List[str]:
    """Build a collapsible <details> block with icon summary and chevron."""
    primary = DESCRIPTION_THEME["primary"]
    parts = [
        '<details class="gd-accordion">',
        "<summary>",
        '<span class="gd-summary-inner">',
        f'<span class="gd-summary-icon">{_svg_icon(icon_name, primary)}</span>',
        f'<span class="gd-summary-label">{html.escape(title)}</span>',
        "</span>",
        f'<span class="gd-chevron">{_svg_icon("chevron", "#6b7280")}</span>',
        "</summary>",
        '<div class="gd-detail-body">',
    ]
    parts.extend(body_parts)
    parts.append("</div>")
    parts.append("</details>")
    return parts


def _clean_raw_description_text(text: str) -> str:
    """Remove invisible chars and bogus HTML entities from source description text."""
    if not text:
        return text
    # Literal entity strings from CMS/export (not decoded by JSON)
    text = text.replace("&ZeroWidthSpace;", "")
    text = text.replace("&#8203;", "")
    text = text.replace("&#x200B;", "")
    # Unicode zero-width / format characters
    for ch in ("\u200b", "\u200c", "\u200d", "\u2060", "\ufeff", "\u00ad"):
        text = text.replace(ch, "")
    return text


def _fix_orphan_li_lines(text: str) -> str:
    """
    Convert lines that end with [/li] but lack a [li] opener into full [li]...[/li] pairs.
    Must run before global [/li] replacement (avoids breaking valid [li] tags).
    """
    lines: List[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            lines.append(line)
            continue
        if re.match(r"^\[li\]", stripped, re.IGNORECASE):
            lines.append(line)
            continue
        m = re.match(r"^(.+?)\[/li\]\s*$", stripped, re.IGNORECASE)
        if m:
            content = m.group(1).strip()
            lines.append(f"[li]{content}[/li]")
        else:
            lines.append(line)
    return "\n".join(lines)


def _repair_broken_list_html(text: str) -> str:
    """Fix corrupted list markup from legacy conversion bugs ([l + <li>i])."""
    text = re.sub(r"\[l<li>i\]", "<li>", text, flags=re.IGNORECASE)
    text = re.sub(r"<li>i\]([^<]*)</li>", r"<li>\1</li>", text, flags=re.IGNORECASE)
    text = re.sub(r"^\[l\s*$", "", text, flags=re.MULTILINE | re.IGNORECASE)
    return text


def _bbcode_to_html(text: str) -> str:
    """Convert BBCode-style tags and clean up text for safe HTML rendering."""
    text = _clean_raw_description_text(text)

    if _is_json_blob(text):
        return ""

    # Normalize escaped slashes in BBCode tags (e.g. [\/li] -> [/li])
    text = text.replace("[\\/", "[/")

    # Orphan [/li] lines only — never run global regex before [li] conversion
    text = _fix_orphan_li_lines(text)

    text = re.sub(r"\[ul\]", "<ul>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[/ul\]", "</ul>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[ol\]", "<ol>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[/ol\]", "</ol>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[li\]", "<li>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[/li\]", "</li>", text, flags=re.IGNORECASE)
    text = re.sub(r"\[b\](.*?)\[/b\]", r"<strong>\1</strong>", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"\[i\](.*?)\[/i\]", r"<em>\1</em>", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"\[u\](.*?)\[/u\]", r"<u>\1</u>", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"\[br\]", "<br>", text, flags=re.IGNORECASE)

    text = _repair_broken_list_html(text)

    has_html_tags = bool(re.search(r"<(ul|ol|li|p|strong|em|br)[^>]*>", text, re.IGNORECASE))
    if has_html_tags:
        return text

    paragraphs = text.split("\n\n")
    result_parts = []
    for para in paragraphs:
        para = para.strip()
        if para:
            lines = para.split("\n")
            escaped = "<br>".join(html.escape(line) for line in lines)
            result_parts.append(f"<p>{escaped}</p>")
    return "\n".join(result_parts)


def _render_figure_html(media: Dict[str, Any], alt: str, align: str) -> str:
    """Render a single inline description image."""
    url = html.escape(media.get("url", ""))
    if not url:
        return ""
    w = media.get("width") or 0
    h = media.get("height") or 0
    align_class = f"gd-figure--{align}" if align == "center" else ""
    dim_attrs = ""
    if w and h:
        dim_attrs = f' width="{w}" height="{h}"'
    return (
        f'<figure class="gd-figure {align_class}">'
        f'<img src="{url}" alt="{html.escape(alt)}" loading="lazy"{dim_attrs}>'
        f"</figure>"
    )


def _render_desc_block_html(block: Dict[str, Any], product_title: str) -> List[str]:
    """Render one description block (heading, text, inline media) in source order."""
    parts: List[str] = []
    heading = block.get("heading")
    text = block.get("text")
    media = block.get("media") or []
    align = block.get("align", "left")

    if heading:
        parts.append(
            f'<h3 class="gd-h3">{html.escape(_clean_raw_description_text(heading))}</h3>'
        )

    is_callout = (
        text
        and len(media) == 1
        and (media[0].get("width") or 0) <= 64
    )

    if is_callout:
        m = media[0]
        rendered = _bbcode_to_html(text)
        if not rendered:
            rendered = f"<p>{html.escape(text)}</p>"
        parts.append('<div class="gd-callout">')
        parts.append(
            f'<img class="gd-callout-icon" src="{html.escape(m["url"])}" alt="" '
            f'width="{m.get("width", 40)}" height="{m.get("height", 40)}">'
        )
        parts.append(f'<div class="gd-callout-text">{rendered}</div>')
        parts.append("</div>")
        return parts

    if text:
        rendered = _bbcode_to_html(text)
        if rendered:
            parts.append(f'<div class="gd-text">{rendered}</div>')

    if len(media) > 1:
        parts.append('<div class="gd-figure-grid">')
        for m in media:
            fig = _render_figure_html(m, product_title, "center")
            if fig:
                parts.append(fig)
        parts.append("</div>")
    elif len(media) == 1:
        fig = _render_figure_html(media[0], product_title, align)
        if fig:
            parts.append(fig)

    for vid in _normalize_video_entries(block.get("videos") or []):
        poster_attr = f' poster="{html.escape(vid["poster"])}"' if vid.get("poster") else ""
        parts.append(
            f'<div class="gd-video"><video src="{html.escape(vid["url"])}" controls playsinline{poster_attr}></video></div>'
        )

    features = block.get("features") or []
    if features:
        parts.append('<div class="gd-features">')
        for feat in features:
            title = html.escape(str(feat.get("title") or ""))
            body = html.escape(str(feat.get("body") or ""))
            img = str(feat.get("image") or "")
            parts.append('<div class="gd-feature">')
            if img:
                parts.append(
                    f'<img src="{html.escape(img)}" alt="{title}" loading="lazy">'
                )
            parts.append("<div>")
            if title:
                parts.append(f"<h4>{title}</h4>")
            if body:
                parts.append(f"<p>{body}</p>")
            parts.append("</div></div>")
        parts.append("</div>")

    model_3d = block.get("model_3d") or {}
    if isinstance(model_3d, dict) and model_3d.get("url"):
        url = html.escape(str(model_3d["url"]))
        parts.append(
            f'<div class="gd-3d"><a rel="noopener noreferrer" target="_blank" href="{url}">'
            f"View 3D model (.glb)</a></div>"
        )

    return parts


def create_description_html(product: Dict[str, Any]) -> str:
    parts: List[str] = []
    primary = DESCRIPTION_THEME["primary"]

    parts.append('<div class="gd">')

    short_desc = _clean_raw_description_text(product.get("short_description", ""))
    if short_desc:
        parts.append('<div class="gd-intro">')
        parts.append('<div class="gd-intro-header">')
        parts.append(f'<span class="gd-intro-icon">{_svg_icon("overview", "#fff", 22)}</span>')
        parts.append("<div>")
        parts.append("<h2>Product Overview</h2>")
        parts.append(f"<p>{html.escape(short_desc)}</p>")
        parts.append("</div></div></div>")

    desc_blocks = product.get("desc_blocks", [])
    if desc_blocks:
        body: List[str] = []
        product_title = product.get("title", "")
        for block in desc_blocks:
            body.extend(_render_desc_block_html(block, product_title))
        parts.extend(_accordion_section("Detailed Description", "doc", body))

    specs = product.get("specifications", [])
    if specs:
        spec_body: List[str] = []
        ext_icon = _svg_icon("external", primary)
        for group in specs:
            tech = html.escape(group.get("technology", "General"))
            items = group.get("items", [])
            if not items:
                continue
            spec_body.append(f'<div class="spec-cat">{tech}</div>')
            spec_body.append('<div class="gd-table-wrap">')
            spec_body.append('<div class="specs-table">')
            for item in items:
                name = html.escape(str(item.get("name", "")))
                value = item.get("value", "")
                canonical = item.get("canonicalUid")
                row_class = "specs-row"
                if item.get("is_group"):
                    row_class += " specs-group"
                elif item.get("parent"):
                    row_class += " specs-child"
                if canonical:
                    val_escaped = html.escape(str(value))
                    val_html = (
                        f'<a rel="noreferrer" target="_blank" href="/shop/{html.escape(str(canonical))}">'
                        f"{val_escaped}{ext_icon}</a>"
                    )
                else:
                    val_html = html.escape(str(value))
                spec_body.append(
                    f'<div class="{row_class}"><div class="spec-label">{name}</div>'
                    f'<div class="spec-value">{val_html}</div></div>'
                )
            spec_body.append("</div></div>")
        parts.extend(_accordion_section("Technical Specifications", "specs", spec_body))

    files = product.get("files", [])
    if files:
        parts.append('<div class="dl-section">')
        parts.append('<div class="dl-section-header">')
        parts.append(f'<span class="dl-section-icon">{_svg_icon("download", primary)}</span>')
        parts.append('<h3 class="gd-h3">Downloads &amp; Resources</h3>')
        parts.append("</div>")
        parts.append('<ul class="dl-list">')
        for f in files:
            url = html.escape(f.get("url", ""))
            title = html.escape(f.get("title", "Document"))
            if url:
                parts.append(
                    f'<li class="gd-dl-item">'
                    f'<span class="gd-dl-icon">{_svg_icon("file", primary)}</span>'
                    f'<a rel="noopener noreferrer" target="_blank" href="{url}">{title}</a>'
                    f"</li>"
                )
        parts.append("</ul></div>")

    parts.append("</div>")
    # Trailing, not leading: fileinfo sniffs the head of the upload for markup
    # like "<style" and would classify the whole CSV as HTML. CSS applies to the
    # markup above it regardless of where the block sits.
    parts.append(f"<style>\n{_build_description_css()}</style>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Menu taxonomy (Brands + Categories reference trees)
# ---------------------------------------------------------------------------

PRODUCT_EXTENSIONS = (".html", ".htm", ".json")
SKIP_DIR_NAMES = {"menu", "output", ".git", "__pycache__", "node_modules"}


def _known_product_extension(name: str) -> Optional[str]:
    """Return extension only if filename ends with a known product type (not Path.suffix)."""
    lower = name.lower()
    for ext in PRODUCT_EXTENSIONS:
        if lower.endswith(ext):
            return ext
    return None


def _product_csv_path(source: Path) -> Path:
    """Output .csv path preserving full product filename (handles dots like U.fl)."""
    ext = _known_product_extension(source.name)
    if ext:
        return source.parent / f"{source.name[: -len(ext)]}.csv"
    return source.parent / f"{source.name}.csv"


def _is_output_directory(path: Path, original: str = "") -> bool:
    """True when -o should be treated as a folder, not a CSV filename."""
    if path.is_dir():
        return True
    if original.endswith(("/", "\\")):
        return True
    suffix = path.suffix.lower()
    if suffix in (".csv", ".json"):
        return False
    return suffix == ""


def _product_json_path(source: Path) -> Path:
    """Output .json path preserving full product filename (handles dots like U.fl)."""
    ext = _known_product_extension(source.name)
    if ext:
        return source.parent / f"{source.name[: -len(ext)]}.json"
    return source.parent / f"{source.name}.json"


def _output_stem(path: Path) -> str:
    lower = path.name.lower()
    for ext in (".csv", ".json", ".html", ".htm"):
        if lower.endswith(ext):
            return path.name[: -len(ext)]
    return path.name


def _looks_like_web_content(path: Path) -> bool:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            head = f.read(2048)
        lower = head.lower()
        stripped = head.lstrip("\ufeff").lstrip()
        if stripped.startswith(("{", "[")):
            return True
        if "<html" in lower or "<!doctype html" in lower:
            return True
        if "vike_pagecontext" in lower:
            return True
        if "__next_data__" in lower or "cdn.ecomm.ui.com" in lower:
            return True
        return False
    except OSError:
        return False


def normalize_menu_name(name: str) -> str:
    """Case-insensitive key for matching folder segments and Getic titles to Menu nodes."""
    if not name:
        return ""
    s = name.strip().lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[_\-]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _clean_menu_title(raw: str) -> str:
    t = raw.strip()
    t = re.sub(r"^\*+|\*+$", "", t)
    return t.strip()


@dataclass
class MenuNode:
    title: str
    children: Dict[str, MenuNode] = field(default_factory=dict)

    def add_child(self, title: str) -> MenuNode:
        key = normalize_menu_name(title)
        if key in self.children:
            return self.children[key]
        node = MenuNode(title=title)
        self.children[key] = node
        return node


@dataclass
class MenuTree:
    root: MenuNode
    all_paths: Set[str] = field(default_factory=set)
    leaf_to_paths: Dict[str, List[str]] = field(default_factory=dict)

    def collect_paths(self) -> None:
        self.all_paths.clear()
        self.leaf_to_paths.clear()

        def walk(node: MenuNode, ancestors: List[str]) -> None:
            path = ancestors + [node.title]
            for i in range(1, len(path) + 1):
                p = " > ".join(path[:i])
                self.all_paths.add(p)
            if not node.children:
                leaf = node.title
                full = " > ".join(path)
                self.leaf_to_paths.setdefault(leaf, []).append(full)
            for child in node.children.values():
                walk(child, path)

        walk(self.root, [])


def _parse_menu_markdown(text: str) -> MenuNode:
    """Parse nested '- **Title**' bullets into a MenuNode tree."""
    root = MenuNode(title="")
    stack: List[Tuple[int, MenuNode]] = [(-1, root)]

    for line in text.splitlines():
        if not line.strip().startswith("- "):
            continue
        indent = len(line) - len(line.lstrip())
        level = indent // 2
        m = re.match(r"^\s*-\s+\*\*(.+?)\*\*\s*$", line)
        if not m:
            m = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if not m:
            continue
        title = _clean_menu_title(m.group(1))
        if not title:
            continue

        while len(stack) > 1 and stack[-1][0] >= level:
            stack.pop()

        parent = stack[-1][1]
        node = parent.add_child(title)
        stack.append((level, node))

    if not root.children:
        raise ValueError("Menu file has no category bullets")
    # Single root brand/category file: return the one top-level node as tree root
    return next(iter(root.children.values()))


@dataclass
class MenuTaxonomy:
    brand_trees: Dict[str, MenuTree] = field(default_factory=dict)
    store_trees: List[MenuTree] = field(default_factory=list)
    all_paths: Set[str] = field(default_factory=set)
    all_titles: Set[str] = field(default_factory=set)
    brand_aliases: Dict[str, str] = field(default_factory=dict)

    @classmethod
    def load(cls, menu_dir: Path) -> MenuTaxonomy:
        menu_dir = Path(menu_dir)
        if not menu_dir.is_dir():
            raise FileNotFoundError(f"Menu directory not found: {menu_dir}")

        tax = cls()
        brands_dir = menu_dir / "Brands"
        cats_dir = menu_dir / "Categories"

        if brands_dir.is_dir():
            for md in sorted(brands_dir.glob("*.md")):
                if md.name.lower().startswith("all "):
                    continue
                root = _parse_menu_markdown(md.read_text(encoding="utf-8"))
                tree = MenuTree(root=root)
                tree.collect_paths()
                brand_key = root.title
                tax.brand_trees[brand_key] = tree
                tax.brand_aliases[normalize_menu_name(brand_key)] = brand_key
                stem = md.stem.replace("-Brand-and-Categories", "")
                tax.brand_aliases[normalize_menu_name(stem.replace("_", " "))] = brand_key
                tax.brand_aliases[normalize_menu_name(stem)] = brand_key

        # Prefer lowercase unifi brand tree over Ubiquiti "UniFi *" folder collisions
        if "unifi" in tax.brand_trees:
            tax.brand_aliases[normalize_menu_name("unifi")] = "unifi"

        if cats_dir.is_dir():
            for md in sorted(cats_dir.glob("*.md")):
                if md.name.lower().startswith("all "):
                    continue
                root = _parse_menu_markdown(md.read_text(encoding="utf-8"))
                tree = MenuTree(root=root)
                tree.collect_paths()
                tax.store_trees.append(tree)

        tax._rebuild_global_index()
        return tax

    def _rebuild_global_index(self) -> None:
        self.all_paths.clear()
        self.all_titles.clear()
        for tree in list(self.brand_trees.values()) + self.store_trees:
            self.all_paths.update(tree.all_paths)
            for path in tree.all_paths:
                for seg in path.split(" > "):
                    self.all_titles.add(seg)

    def resolve_brand_key(self, name: str) -> Optional[str]:
        if name in self.brand_trees:
            return name
        return self.brand_aliases.get(normalize_menu_name(name))

    def get_brand_tree(self, brand_name: str) -> Optional[MenuTree]:
        key = self.resolve_brand_key(brand_name)
        if key:
            return self.brand_trees.get(key)
        return None


def _walk_tree_segments(
    tree: MenuTree,
    segments: List[str],
    prefix: Optional[List[str]] = None,
) -> Optional[List[str]]:
    """Walk tree by segment titles; return full path list if all segments match."""
    if prefix is None:
        prefix = [tree.root.title]
    node = tree.root
    path = list(prefix)
    for seg in segments:
        key = normalize_menu_name(seg)
        child = node.children.get(key)
        if child is None:
            return None
        path.append(child.title)
        node = child
    return path


def _paths_with_prefixes(path_parts: List[str]) -> Set[str]:
    paths: Set[str] = set()
    cleaned = [p.strip() for p in path_parts if p and str(p).strip()]
    for i in range(1, len(cleaned) + 1):
        paths.add(" > ".join(cleaned[:i]))
    return paths


def folder_segments_to_prefixed_paths(segments: List[str]) -> List[str]:
    """Turn folder levels into full path + all ancestor prefixes (variable depth)."""
    return sorted(
        _paths_with_prefixes(segments),
        key=lambda p: (len(p.split(" > ")), p),
    )


def _segments_from_paths(paths: List[str]) -> List[str]:
    """Deduped segment titles from deepest paths first."""
    ordered: List[str] = []
    seen: Set[str] = set()
    for path in sorted(paths, key=lambda p: (-len(p.split(" > ")), p)):
        for seg in path.split(" > "):
            seg = seg.strip()
            if seg and seg not in seen:
                seen.add(seg)
                ordered.append(seg)
    return ordered


def _strip_root_prefix(tree: MenuTree, segments: List[str]) -> List[str]:
    segs = list(segments)
    if segs and normalize_menu_name(segs[0]) == normalize_menu_name(tree.root.title):
        return segs[1:]
    return segs


def _walk_getic_segments(tree: MenuTree, segments: List[str]) -> Optional[List[str]]:
    """Longest valid prefix walk from brand root through Getic segment list."""
    segments = _strip_root_prefix(tree, segments)
    path = [tree.root.title]
    node = tree.root
    matched_any = len(segments) > 0

    for seg in segments:
        key = normalize_menu_name(seg)
        child = node.children.get(key)
        if child is None:
            break
        path.append(child.title)
        node = child

    if not matched_any and len(path) == 1:
        return None
    if len(path) == 1:
        return None
    return path


def _resolve_store_path(tax: MenuTaxonomy, cat_segments: List[str]) -> Optional[List[str]]:
    if not cat_segments:
        return None

    best: Optional[List[str]] = None
    best_score = -1

    for tree in tax.store_trees:
        segs = _strip_root_prefix(tree, cat_segments)
        walked = _walk_tree_segments(tree, segs)
        if walked:
            score = len(walked)
            if score > best_score:
                best_score = score
                best = walked
            continue

        leaf = segs[-1] if segs else cat_segments[-1]
        candidates = tree.leaf_to_paths.get(leaf, [])
        if not candidates:
            for alt_leaf, paths in tree.leaf_to_paths.items():
                if normalize_menu_name(alt_leaf) == normalize_menu_name(leaf):
                    candidates.extend(paths)
        for cand in candidates:
            cand_parts = cand.split(" > ")
            score = 0
            for i, seg in enumerate(segs):
                idx = i + 1
                if idx < len(cand_parts) and normalize_menu_name(cand_parts[idx]) == normalize_menu_name(seg):
                    score += 1
            if score > best_score:
                best_score = score
                best = cand_parts

    return best


def resolve_menu_category_paths(
    product: Dict[str, Any],
    brand_name: str,
    folder_segments: List[str],
    menu: MenuTaxonomy,
    *,
    brand_folder_segments: Optional[List[str]] = None,
    category_folder_segments: Optional[List[str]] = None,
) -> Tuple[List[str], List[str], List[str]]:
    """
    Resolve Brands and Categories taxonomy paths separately.

    Folder paths are authoritative when provided (any depth). Menu/Getic fill gaps
    and may validate, but folder-derived paths are never dropped for Menu mismatch.

    Returns (brand_paths, category_paths, warnings).
    Both path lists include ancestor prefixes so a product belongs to every level.
    """
    warnings: List[str] = []
    brand_set: Set[str] = set()
    category_set: Set[str] = set()
    brand_from_folder: Set[str] = set()
    category_from_folder: Set[str] = set()

    brand_segs = list(brand_folder_segments or [])
    category_segs = list(category_folder_segments or [])

    # --- Folder-driven brand path (SoT) ---
    if brand_segs:
        brand_from_folder = _paths_with_prefixes(brand_segs)
        brand_set.update(brand_from_folder)
    elif folder_segments and brand_name:
        # Legacy: brand root + relative folder segments
        legacy_brand = [brand_name] + list(folder_segments)
        brand_from_folder = _paths_with_prefixes(legacy_brand)
        brand_set.update(brand_from_folder)

    # --- Folder-driven category path (SoT) ---
    if category_segs:
        category_from_folder = _paths_with_prefixes(category_segs)
        category_set.update(category_from_folder)

    # --- Optional Menu / Getic enrichment (does not override folder SoT) ---
    brand_tree = menu.get_brand_tree(brand_name) if brand_name else None
    if brand_tree is None and brand_name and not brand_from_folder:
        warnings.append(f"Brand '{brand_name}' not found in Menu/Brands")

    if brand_tree is not None:
        getic_brand_segs = list(product.get("brand_path_titles", []))
        cat_root = product.get("category_root", "")
        if cat_root:
            getic_brand_segs = getic_brand_segs + [cat_root]
        walked = _walk_getic_segments(brand_tree, getic_brand_segs)
        if walked:
            brand_set.update(_paths_with_prefixes(walked))

        # If no folder brand path yet, try matching legacy folder segments to Menu
        if not brand_from_folder and folder_segments:
            walked = _walk_tree_segments(brand_tree, folder_segments)
            if not walked:
                walked = _walk_getic_segments(brand_tree, folder_segments)
            if walked:
                brand_set.update(_paths_with_prefixes(walked))

    cat_segs = list(product.get("cat_path_titles", []))
    cat_leaf = product.get("cat_leaf", "")
    if cat_leaf:
        cat_segs = cat_segs + [cat_leaf]
    if cat_segs:
        store_path = _resolve_store_path(menu, cat_segs)
        if store_path:
            category_set.update(_paths_with_prefixes(store_path))
        elif not category_from_folder:
            # Folder-free Getic path: keep as data-driven path even if not in Menu
            category_set.update(_paths_with_prefixes(cat_segs))
            warnings.append(
                f"Getic store category not in Menu (kept as folder-style path): "
                f"{' > '.join(cat_segs)}"
            )

    # Legacy single-tree folders may encode store categories when dual-root absent
    if not category_from_folder and folder_segments and not brand_from_folder:
        store_from_folder = _resolve_store_path(menu, folder_segments)
        if store_from_folder:
            category_set.update(_paths_with_prefixes(store_from_folder))
        else:
            best: Optional[List[str]] = None
            best_len = 0
            for tree in menu.store_trees:
                walked = _walk_getic_segments(tree, folder_segments)
                if walked and len(walked) > best_len:
                    best = walked
                    best_len = len(walked)
            if best:
                category_set.update(_paths_with_prefixes(best))

    # Keep folder-derived paths always; optionally keep Menu-validated extras
    brand_paths = sorted(
        brand_from_folder
        | {p for p in brand_set if p in menu.all_paths or p in brand_from_folder},
        key=lambda p: (len(p.split(" > ")), p),
    )
    # Dedup while preserving folder authority
    brand_paths = sorted(set(brand_paths) | brand_from_folder, key=lambda p: (len(p.split(" > ")), p))
    category_paths = sorted(
        set(category_set) | category_from_folder,
        key=lambda p: (len(p.split(" > ")), p),
    )

    return brand_paths, category_paths, warnings


def resolve_menu_category_paths_merged(
    product: Dict[str, Any],
    brand_name: str,
    folder_segments: List[str],
    menu: MenuTaxonomy,
    *,
    brand_folder_segments: Optional[List[str]] = None,
    category_folder_segments: Optional[List[str]] = None,
) -> Tuple[List[str], List[str]]:
    """Backward-compatible wrapper returning merged paths + warnings."""
    brand_paths, category_paths, warnings = resolve_menu_category_paths(
        product,
        brand_name,
        folder_segments,
        menu,
        brand_folder_segments=brand_folder_segments,
        category_folder_segments=category_folder_segments,
    )
    merged = sorted(
        set(brand_paths) | set(category_paths),
        key=lambda p: (len(p.split(" > ")), p),
    )
    return merged, warnings


def _is_product_file(path: Path) -> bool:
    """
    Detect product input files by extension or web/JSON content sniffing.
    Do not use Path.suffix — names like 'Pigtail U.fl Female - SMA Male 20cm'
    have dots that are not extensions.
    """
    if not path.is_file() or path.name.startswith("."):
        return False
    ext = _known_product_extension(path.name)
    if ext in PRODUCT_EXTENSIONS:
        return True
    return _looks_like_web_content(path)


def _should_skip_dir(path: Path) -> bool:
    return path.name.lower() in SKIP_DIR_NAMES or path.name.startswith(".")


@dataclass
class ProductJob:
    input_path: Path
    output_path: Path
    brand_name: str
    folder_segments: List[str] = field(default_factory=list)
    # Full folder hierarchy for Brands tree (includes brand root), any depth
    brand_folder_segments: List[str] = field(default_factory=list)
    # Full folder hierarchy for Categories tree (includes category root), any depth
    category_folder_segments: List[str] = field(default_factory=list)


def _product_stem_key(path: Path) -> str:
    """Stable key for merging the same product across Brands/ and Categories/ trees."""
    name = path.name
    ext = _known_product_extension(name)
    stem = name[: -len(ext)] if ext else name
    return normalize_menu_name(stem)


def _find_taxonomy_root(input_root: Path, names: Set[str]) -> Optional[Path]:
    for d in sorted(input_root.iterdir()):
        if d.is_dir() and not _should_skip_dir(d) and d.name.strip().lower() in names:
            return d
    return None


def _detect_dual_taxonomy_roots(input_root: Path) -> Tuple[Optional[Path], Optional[Path]]:
    """
    Detect Brands/ and Categories/ classification roots under the input folder.
    Names are case-insensitive; singular Brand/Category also accepted.
    """
    brands = _find_taxonomy_root(input_root, {"brands", "brand"})
    categories = _find_taxonomy_root(input_root, {"categories", "category"})
    return brands, categories


def _collect_jobs_under_tree(
    tree_root: Path,
    output_dir: Path,
    *,
    taxonomy: str,
    menu: MenuTaxonomy,
) -> List[ProductJob]:
    """
    Walk a Brands/ or Categories/ tree. Every folder level becomes a classification
    segment; the product inherits the complete path from the taxonomy child root.
    """
    jobs: List[ProductJob] = []
    if not tree_root.is_dir():
        return jobs

    for fp in sorted(tree_root.rglob("*")):
        if not _is_product_file(fp):
            continue
        # Skip nested Brands/Categories confusion
        if any(_should_skip_dir(p) for p in fp.parents if p != tree_root and tree_root in p.parents):
            # only skip known skip dirs
            pass
        rel = fp.relative_to(tree_root)
        # rel.parts[:-1] = folder path under Brands/ or Categories/
        # e.g. Ubiquiti/60 GHz Wireless/airFiber 60 GHz/file.html
        segments = list(rel.parent.parts) if rel.parent.parts != (".",) and rel.parent != Path(".") else []
        if not segments and rel.parent == Path("."):
            segments = []

        brand_name = ""
        brand_folder_segments: List[str] = []
        category_folder_segments: List[str] = []
        folder_segments: List[str] = []

        if taxonomy == "brand":
            brand_folder_segments = segments
            brand_name = segments[0] if segments else ""
            if brand_name:
                resolved = menu.resolve_brand_key(brand_name)
                if resolved:
                    brand_name = resolved
                    # Prefer Menu root title casing when available
                    brand_folder_segments = [brand_name] + segments[1:]
            folder_segments = segments[1:] if len(segments) > 1 else []
            out = output_dir / "Brands" / _product_csv_path(rel)
        else:
            category_folder_segments = segments
            folder_segments = segments
            out = output_dir / "Categories" / _product_csv_path(rel)

        jobs.append(
            ProductJob(
                input_path=fp,
                output_path=out,
                brand_name=brand_name,
                folder_segments=folder_segments,
                brand_folder_segments=brand_folder_segments,
                category_folder_segments=category_folder_segments,
            )
        )
    return jobs


def _merge_dual_taxonomy_jobs(brand_jobs: List[ProductJob], category_jobs: List[ProductJob]) -> List[ProductJob]:
    """
    Merge products that appear in both Brands/ and Categories/ trees (same file stem).
    Prefer the Brands/ file as the content source; keep Categories/ path for classification.
    """
    by_stem: Dict[str, ProductJob] = {}

    for job in brand_jobs:
        key = _product_stem_key(job.input_path)
        by_stem[key] = job

    for job in category_jobs:
        key = _product_stem_key(job.input_path)
        existing = by_stem.get(key)
        if existing is None:
            by_stem[key] = job
            continue
        # Merge category folder path onto brand job
        existing.category_folder_segments = list(job.category_folder_segments)
        if not existing.brand_name and job.brand_name:
            existing.brand_name = job.brand_name

    return sorted(by_stem.values(), key=lambda j: str(j.input_path).lower())


def _dirs_with_products(root: Path) -> Set[Path]:
    found: Set[Path] = set()
    for p in root.rglob("*"):
        if p.is_file() and _is_product_file(p):
            # Skip products nested under skip dirs
            if any(_should_skip_dir(parent) for parent in p.parents):
                continue
            found.add(p.parent)
    return found


def _detect_layout(
    input_root: Path,
    menu: MenuTaxonomy,
    brand_override: Optional[str],
) -> Tuple[bool, Dict[Path, str]]:
    """
    Return (multi_brand, mapping of base_path -> brand_name).
    Multi-brand if every top-level child dir that contains products is a known Menu brand.
    """
    child_dirs = [
        d for d in sorted(input_root.iterdir())
        if d.is_dir() and not _should_skip_dir(d)
    ]
    # Ignore Brands/Categories taxonomy roots in legacy multi-brand detection
    child_dirs = [
        d for d in child_dirs
        if d.name.strip().lower() not in {"brands", "brand", "categories", "category"}
    ]
    product_parents = _dirs_with_products(input_root)

    def dir_has_products(d: Path) -> bool:
        return any(
            pp == d or d in pp.parents
            for pp in product_parents
        )

    brand_children = [d for d in child_dirs if dir_has_products(d)]
    if brand_children:
        keys = []
        for d in brand_children:
            key = menu.resolve_brand_key(d.name)
            if key:
                keys.append(key)
        if len(keys) == len(brand_children) and len(brand_children) > 0:
            return True, {d: menu.resolve_brand_key(d.name) or d.name for d in brand_children}

    brand = brand_override or menu.resolve_brand_key(input_root.name) or input_root.name
    return False, {input_root: brand}


def discover_product_jobs(
    input_root: Path,
    output_dir: Path,
    menu: MenuTaxonomy,
    brand_override: Optional[str],
) -> List[ProductJob]:
    """
    Discover product conversion jobs.

    Preferred layout (folder-driven dual taxonomy):
      input/Brands/<Brand>/.../<sub...>/product.html
      input/Categories/<Category>/.../<sub...>/product.html

    Same product stem under both trees is merged into one job with both paths.

    Legacy layouts still supported:
      input/<Brand>/.../product.html  (multi-brand)
      input/.../product.html          (single-brand)
    """
    input_root = input_root.resolve()
    brands_root, categories_root = _detect_dual_taxonomy_roots(input_root)

    if brands_root is not None or categories_root is not None:
        brand_jobs = (
            _collect_jobs_under_tree(brands_root, output_dir, taxonomy="brand", menu=menu)
            if brands_root is not None
            else []
        )
        category_jobs = (
            _collect_jobs_under_tree(categories_root, output_dir, taxonomy="category", menu=menu)
            if categories_root is not None
            else []
        )
        return _merge_dual_taxonomy_jobs(brand_jobs, category_jobs)

    multi, base_to_brand = _detect_layout(input_root, menu, brand_override)
    jobs: List[ProductJob] = []

    if multi:
        for base_path, brand_name in base_to_brand.items():
            for fp in sorted(base_path.rglob("*")):
                if not _is_product_file(fp):
                    continue
                rel = fp.relative_to(base_path)
                folder_segments = list(rel.parent.parts) if rel.parent.parts else []
                brand_folder_segments = [brand_name] + folder_segments
                out = output_dir / base_path.name / _product_csv_path(rel)
                jobs.append(
                    ProductJob(
                        fp,
                        out,
                        brand_name,
                        folder_segments,
                        brand_folder_segments=brand_folder_segments,
                        category_folder_segments=[],
                    )
                )
    else:
        brand_name = base_to_brand[input_root]
        for fp in sorted(input_root.rglob("*")):
            if any(_should_skip_dir(p) for p in [fp] + list(fp.parents) if p.is_dir() and p != input_root):
                if fp.is_dir() and _should_skip_dir(fp):
                    continue
            if not fp.is_file():
                continue
            if not _is_product_file(fp):
                continue
            # Skip files under skip dirs
            if any(_should_skip_dir(parent) for parent in fp.parents if parent != input_root):
                continue
            rel = fp.relative_to(input_root)
            folder_segments = list(rel.parent.parts) if rel.parent.parts else []
            brand_folder_segments = [brand_name] + folder_segments if brand_name else list(folder_segments)
            out = output_dir / _product_csv_path(rel)
            jobs.append(
                ProductJob(
                    fp,
                    out,
                    brand_name,
                    folder_segments,
                    brand_folder_segments=brand_folder_segments,
                    category_folder_segments=[],
                )
            )

    return jobs


def format_category_paths(paths: List[str]) -> str:
    return ", ".join(paths) if paths else ""


# ---------------------------------------------------------------------------
# Main category classification (flat WooCommerce layer)
# ---------------------------------------------------------------------------

MAIN_CATEGORIES = frozenset({
    "Security Systems",
    "Fleet Management",
    "LTE / 5G",
    "Fiber Networks",
    "IoT",
    "Mounts & Brackets",
    "Electrical & Power",
    "Accessories",
    "Outdoor",
    "Indoor",
    "Networking",
    "Licenses",
    "Other",
})


def _main_cat_signals(product: Dict[str, Any]) -> str:
    """Build a lowercase haystack of path/title signals for mainCategory matching."""
    parts: List[str] = []
    for path in product.get("menu_category_paths") or []:
        parts.append(str(path))
    for key in ("cat_path_titles", "brand_path_titles", "categories"):
        for title in product.get(key) or []:
            parts.append(str(title))
    for key in (
        "cat_leaf",
        "category_root",
        "title",
        "title_extended",
        "category",
        "name",
        "productTitle",
        "short_description",
    ):
        val = product.get(key) or ""
        if val:
            parts.append(str(val))
    return " | ".join(parts).lower()


def _signal_has_any(haystack: str, needles: Tuple[str, ...]) -> bool:
    return any(n in haystack for n in needles)


def _signal_has_word(haystack: str, word: str) -> bool:
    """Whole-word / path-token match to avoid substring false positives."""
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(word)}(?![a-z0-9])", haystack))


def _signal_has_any_word(haystack: str, words: Tuple[str, ...]) -> bool:
    return any(_signal_has_word(haystack, w) for w in words)


def _signal_is_mount(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "mounts and brackets",
            "camera mounts",
            "outdoor mounts",
            "indoor mounts",
            "antenna mounts",
            "router mounts",
            "unifi mounts",
            "access points mounts",
            "mounting accessories",
            "antenna brackets",
            "video camera brackets",
            "junction boxes",
            " wall mount",
            "wall mounts",
            "pole mount",
            "pole mounts",
            "ceiling mount",
            "ceilling mount",
            "rack mount",
            "rack mounts",
            "bracket",
            " brackets",
        ),
    ) or bool(re.search(r"(^|[\s>|/-])mount(s)?($|[\s>|/-])", haystack))


def _signal_is_poe_accessory(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "poe adapter",
            "poe adapters",
            "poe injector",
            "poe injectors",
            "poe splitter",
            "poe splitters",
            "poe converter",
            "poe converters",
            "passive poe",
            "poe cables",
        ),
    )


def _match_security_systems(haystack: str) -> bool:
    if _signal_is_mount(haystack):
        return False
    if _signal_has_any(
        haystack,
        (
            "security systems",
            "camera security",
            "access control",
            "network storage",
            "surveillance",
            "smart door systems",
            "door stations",
            "indoor stations",
        ),
    ):
        return True
    return _signal_has_any_word(
        haystack,
        (
            "intercom",
            "nvr",
            "doorbell",
            "bullet",
            "dome",
            "turret",
            "ptz",
            "fisheye",
            "webcam",
            "webcams",
            "cameras",
            "camera",
        ),
    )


def _match_fleet_management(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "fleet management",
            "gps tracker",
            "gps trackers",
            "vehicle tracker",
            "vehicle cameras",
            "can adapter",
            "asset tracker",
            "e-scooter tracker",
        ),
    )


def _match_lte_5g(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "lte products",
            "lte ",
            " 4g ",
            "4g/",
            "4g access",
            "4g router",
            "4g gateway",
            "4g modem",
            "4g antenna",
            "4g usb",
            "5g router",
            "5g antenna",
            "5g usb",
            "5g indoor",
            "cat4",
            "cat6",
            "cat7",
            "cat12",
            "cat18",
            "cat-m1",
            "mobile network",
        ),
    )


def _match_fiber_networks(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "fiber networks",
            "fiber products",
            "sfp",
            "gpon",
            "xgs-pon",
            "dac cable",
            "dac cables",
            "patchcord",
            "cwdm",
            "olt",
            "onu/ont",
            "onu",
            "ont ",
        ),
    )


def _match_iot(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "iot solutions",
            "lora",
            "lo ra",
            "tags / sensors",
        ),
    )


def _match_mounts_brackets(haystack: str) -> bool:
    return _signal_is_mount(haystack)


def _match_electrical_power(haystack: str) -> bool:
    if _signal_is_poe_accessory(haystack):
        return False
    return _signal_has_any(
        haystack,
        (
            "electrical equipment",
            "power adapter",
            "power adapters",
            "psu adapter",
            "backup psu",
            "solar panel",
            "solar panels",
            "power cord",
            "power cords",
            "din rail",
            "open frame",
            "hot swap",
            "usb power",
        ),
    )


def _match_accessories(haystack: str) -> bool:
    if _signal_is_poe_accessory(haystack):
        return True
    if _signal_has_any(
        haystack,
        (
            "cables and cabinets",
            "twisted pair",
            "coaxial cables",
            "coaxial pigtails",
            "coaxial adapters",
            "patch cable",
            "usb cables",
            "pigtail",
            "connectors",
            "surge protector",
            "surge protectors",
            "rack cabinets",
            "patch panels",
            "accessory tech",
            "antenna accessories",
            "antenna pigtails",
            "anti-noise shields",
        ),
    ):
        # Fiber / DAC cables already claimed by Fiber Networks when those tokens present
        if _signal_has_any(haystack, ("fiber", "dac cable", "dac cables", "sfp", "gpon")):
            return False
        return True
    return False


def _match_outdoor(haystack: str) -> bool:
    if _signal_is_mount(haystack):
        return False
    if _signal_has_any(
        haystack,
        (
            "outdoor wireless",
            "outdoor access",
            "wifi outdoor",
            "carrier backhaul",
            "integrated antennas",
            "sector antenna",
            "sector antennas",
            "parabolic",
            "horn antenna",
            "horn antennas",
            "ptp link",
            "ptp links",
            "cpe antenna",
            "radio for external",
        ),
    ):
        return True
    if "outdoor" in haystack and _signal_has_any(
        haystack,
        ("antenna", "access point", "cpe", "bridge", "radio", "wireless"),
    ):
        return True
    return False


def _match_indoor(haystack: str) -> bool:
    if _signal_is_mount(haystack):
        return False
    if _signal_has_any(haystack, ("wifi outdoor", "outdoor wireless")):
        return False
    if _signal_has_any(
        haystack,
        (
            "wifi indoor",
            "indoor antenna",
            "indoor antennas",
            "home and office networks",
        ),
    ) and _signal_has_any(
        haystack,
        (
            "access point",
            "access points",
            "wifi router",
            "wifi routers",
            "wifi kit",
            "wifi kits",
            "wifi range",
            "wifi bridge",
            "wifi indoor",
            "indoor antenna",
            "mesh",
            "amplifi",
        ),
    ):
        return True
    if "indoor" in haystack and _signal_has_any(
        haystack,
        ("antenna", "access point", "wifi", "router"),
    ):
        return True
    return False


def _match_networking(haystack: str) -> bool:
    return _signal_has_any(
        haystack,
        (
            "ethernet devices",
            "switches",
            "switch ",
            "wired router",
            "wired routers",
            "network card",
            "network cards",
            "unifi switching",
            "cloud gateway",
            "cloud gateways",
            "unifi os console",
            "embedded router",
            "wifi usb adapter",
            "industrial switch",
            "poe switch",
            "sfp switch",
        ),
    )


def _match_licenses(haystack: str) -> bool:
    return _signal_has_any(haystack, ("licenses", "ui care", "licence"))


_MAIN_CATEGORY_RULES: List[Tuple[str, Any]] = [
    ("Security Systems", _match_security_systems),
    ("Fleet Management", _match_fleet_management),
    ("LTE / 5G", _match_lte_5g),
    ("Fiber Networks", _match_fiber_networks),
    ("IoT", _match_iot),
    ("Mounts & Brackets", _match_mounts_brackets),
    ("Electrical & Power", _match_electrical_power),
    ("Accessories", _match_accessories),
    ("Outdoor", _match_outdoor),
    ("Indoor", _match_indoor),
    ("Networking", _match_networking),
    ("Licenses", _match_licenses),
]


def assign_main_category(product: Dict[str, Any]) -> str:
    """Assign exactly one controlled mainCategory from product signals."""
    haystack = _main_cat_signals(product)
    for name, predicate in _MAIN_CATEGORY_RULES:
        if predicate(haystack):
            return name if name in MAIN_CATEGORIES else "Other"
    return "Other"


# ---------------------------------------------------------------------------
# Matching rules (independent multi-match filter tokens)
# ---------------------------------------------------------------------------

def _has_phrase(haystack: str, phrase: str) -> bool:
    """Whole-phrase match with alphanumeric boundaries (token-aware)."""
    return bool(
        re.search(rf"(?<![a-z0-9]){re.escape(phrase.lower())}(?![a-z0-9])", haystack)
    )


def _has_any_phrase(haystack: str, phrases: Tuple[str, ...]) -> bool:
    return any(_has_phrase(haystack, p) for p in phrases)


def _is_indoor_env(haystack: str) -> bool:
    if _has_any_phrase(haystack, ("wifi outdoor", "outdoor wireless", "outdoor access point")):
        return False
    return _has_any_phrase(
        haystack,
        (
            "indoor",
            "wifi indoor",
            "indoor antenna",
            "indoor antennas",
            "indoor access",
            "home and office networks",
            "home & office",
        ),
    )


def _is_outdoor_env(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        (
            "outdoor",
            "outdoor wireless",
            "wifi outdoor",
            "outdoor access",
            "carrier backhaul",
            "flexible & outdoor",
            "flexible and outdoor",
        ),
    )


def _is_access_point(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("access point", "access points", "unifi access points"),
    )


def _is_router(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("router", "routers", "wifi router", "wifi routers", "wired router", "wired routers"),
    )


def _is_antenna(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("antenna", "antennas", "integrated antennas", "wireless antennas"),
    )


def _is_cpe(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("cpe", "cpe antenna", "cpe antennas"))


def _is_device_like(haystack: str) -> bool:
    return (
        _is_access_point(haystack)
        or _is_router(haystack)
        or _is_antenna(haystack)
        or _is_cpe(haystack)
        or _has_any_phrase(
            haystack,
            ("bridge", "bridges", "radio", "radios", "gateway", "gateways", "wireless"),
        )
    )


def _match_rule_indoor(haystack: str) -> bool:
    return _is_indoor_env(haystack)


def _match_rule_indoor_device(haystack: str) -> bool:
    return _is_indoor_env(haystack) and _is_device_like(haystack)


def _match_rule_indoor_access_point(haystack: str) -> bool:
    return _is_indoor_env(haystack) and _is_access_point(haystack) and not _is_outdoor_env(haystack)


def _match_rule_indoor_router(haystack: str) -> bool:
    return _is_indoor_env(haystack) and _is_router(haystack) and not _is_outdoor_env(haystack)


def _match_rule_indoor_antenna(haystack: str) -> bool:
    return _is_indoor_env(haystack) and _is_antenna(haystack) and not _is_outdoor_env(haystack)


def _match_rule_indoor_cpe(haystack: str) -> bool:
    return _is_indoor_env(haystack) and _is_cpe(haystack) and not _is_outdoor_env(haystack)


def _match_rule_outdoor(haystack: str) -> bool:
    return _is_outdoor_env(haystack)


def _match_rule_outdoor_device(haystack: str) -> bool:
    return _is_outdoor_env(haystack) and _is_device_like(haystack)


def _match_rule_outdoor_access_point(haystack: str) -> bool:
    return _is_outdoor_env(haystack) and _is_access_point(haystack)


def _match_rule_outdoor_router(haystack: str) -> bool:
    return _is_outdoor_env(haystack) and _is_router(haystack)


def _match_rule_outdoor_antenna(haystack: str) -> bool:
    return _is_outdoor_env(haystack) and _is_antenna(haystack)


def _match_rule_outdoor_cpe(haystack: str) -> bool:
    return _is_outdoor_env(haystack) and _is_cpe(haystack)


def _match_rule_sector_antenna(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("sector antenna", "sector antennas"))


def _match_rule_parabolic_antenna(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("parabolic", "parabolic antenna", "parabolic antennas", "parabolic dish"),
    )


def _match_rule_horn_antenna(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("horn antenna", "horn antennas"))


def _match_rule_ptp(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("ptp", "ptp link", "ptp links", "ptmp"))


def _match_rule_accessories(haystack: str) -> bool:
    if _signal_is_poe_accessory(haystack):
        return True
    return _has_any_phrase(
        haystack,
        (
            "accessories",
            "accessory",
            "accessory tech",
            "cables and cabinets",
            "cable",
            "cables",
            "pigtail",
            "pigtails",
            "connector",
            "connectors",
            "extension",
            "extensions",
            "surge protector",
            "surge protectors",
        ),
    )


def _match_rule_poe(haystack: str) -> bool:
    return _has_phrase(haystack, "poe") or _signal_is_poe_accessory(haystack)


def _match_rule_poe_injector(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("poe injector", "poe injectors", "passive poe injector"))


def _match_rule_poe_splitter(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("poe splitter", "poe splitters"))


def _match_rule_poe_converter(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("poe converter", "poe converters"))


def _match_rule_poe_adapter(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("poe adapter", "poe adapters"))


def _match_rule_cable(haystack: str) -> bool:
    if _has_any_phrase(haystack, ("dac cable", "dac cables", "sfp cable")):
        return False
    return _has_any_phrase(
        haystack,
        (
            "cable",
            "cables",
            "patch cable",
            "patch cables",
            "ethernet cable",
            "usb cable",
            "coaxial cable",
            "cables and cabinets",
            "twisted pair",
            "extension cable",
            "extension cables",
        ),
    )


def _match_rule_ethernet_cable(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        (
            "ethernet cable",
            "ethernet cables",
            "patch cable",
            "patch cables",
            "twisted pair",
            "cat 5e",
            "cat 6",
            "cat 6a",
            "cat 7",
            "cat 8",
        ),
    )


def _match_rule_usb_cable(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("usb cable", "usb cables"))


def _match_rule_coaxial_cable(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("coaxial cable", "coaxial cables", "coax cable", "antenna cable"),
    )


def _match_rule_extension(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("extension", "extensions", "extension cable", "extension cables"),
    )


def _match_rule_pigtail(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("pigtail", "pigtails", "coaxial pigtails", "antenna pigtails"))


def _match_rule_connector(haystack: str) -> bool:
    return _has_any_phrase(haystack, ("connector", "connectors"))


def _match_rule_adapter(haystack: str) -> bool:
    # Token-aware: whole word adapter/adapters only (not unrelated substrings)
    if _signal_is_poe_accessory(haystack) and _has_any_phrase(haystack, ("poe adapter", "poe adapters")):
        return True
    return _has_any_phrase(
        haystack,
        ("adapter", "adapters", "coaxial adapters", "wifi usb adapter"),
    )


def _match_rule_mount(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        (
            "mount",
            "mounts",
            "wall mount",
            "wall mounts",
            "pole mount",
            "pole mounts",
            "ceiling mount",
            "rack mount",
            "outdoor mounts",
            "indoor mounts",
            "camera mounts",
            "antenna mounts",
            "router mounts",
            "unifi mounts",
            "mounting accessories",
        ),
    )


def _match_rule_bracket(haystack: str) -> bool:
    return _has_any_phrase(
        haystack,
        ("bracket", "brackets", "antenna brackets", "video camera brackets"),
    )


_MATCHING_RULE_DETECTORS: List[Tuple[str, Any]] = [
    ("indoor", _match_rule_indoor),
    ("indoor_device", _match_rule_indoor_device),
    ("indoor_access_point", _match_rule_indoor_access_point),
    ("indoor_router", _match_rule_indoor_router),
    ("indoor_antenna", _match_rule_indoor_antenna),
    ("indoor_cpe", _match_rule_indoor_cpe),
    ("outdoor", _match_rule_outdoor),
    ("outdoor_device", _match_rule_outdoor_device),
    ("outdoor_access_point", _match_rule_outdoor_access_point),
    ("outdoor_router", _match_rule_outdoor_router),
    ("outdoor_antenna", _match_rule_outdoor_antenna),
    ("outdoor_cpe", _match_rule_outdoor_cpe),
    ("sector_antenna", _match_rule_sector_antenna),
    ("parabolic_antenna", _match_rule_parabolic_antenna),
    ("horn_antenna", _match_rule_horn_antenna),
    ("ptp", _match_rule_ptp),
    ("accessories", _match_rule_accessories),
    ("poe", _match_rule_poe),
    ("poe_injector", _match_rule_poe_injector),
    ("poe_splitter", _match_rule_poe_splitter),
    ("poe_converter", _match_rule_poe_converter),
    ("poe_adapter", _match_rule_poe_adapter),
    ("cable", _match_rule_cable),
    ("ethernet_cable", _match_rule_ethernet_cable),
    ("usb_cable", _match_rule_usb_cable),
    ("coaxial_cable", _match_rule_coaxial_cable),
    ("extension", _match_rule_extension),
    ("pigtail", _match_rule_pigtail),
    ("connector", _match_rule_connector),
    ("adapter", _match_rule_adapter),
    ("mount", _match_rule_mount),
    ("bracket", _match_rule_bracket),
]


def _main_category_fallback_token(main_category: str) -> str:
    """Stable snake_case token derived from mainCategory (never empty)."""
    token = re.sub(r"[^a-z0-9]+", "_", (main_category or "other").lower()).strip("_")
    return token or "other"


def _content_fallback_matching_rules(haystack: str) -> List[str]:
    """
    Derive Indoor/Outdoor/Accessories tokens from content when primary detectors
    miss (e.g. LTE router with no explicit indoor/outdoor path).
    """
    rules: List[str] = []
    outdoor = _is_outdoor_env(haystack)
    # Soft indoor: device-like product with no outdoor signals
    indoor = _is_indoor_env(haystack) or (
        not outdoor and _is_device_like(haystack)
    )

    if outdoor:
        rules.append("outdoor")
        if _is_device_like(haystack):
            rules.append("outdoor_device")
        if _is_access_point(haystack):
            rules.append("outdoor_access_point")
        if _is_router(haystack):
            rules.append("outdoor_router")
        if _is_antenna(haystack):
            rules.append("outdoor_antenna")
        if _is_cpe(haystack):
            rules.append("outdoor_cpe")
    elif indoor:
        rules.append("indoor")
        if _is_device_like(haystack):
            rules.append("indoor_device")
        if _is_access_point(haystack):
            rules.append("indoor_access_point")
        if _is_router(haystack):
            rules.append("indoor_router")
        if _is_antenna(haystack):
            rules.append("indoor_antenna")
        if _is_cpe(haystack):
            rules.append("indoor_cpe")

    if _match_rule_poe(haystack):
        rules.append("poe")
    if _match_rule_cable(haystack):
        rules.append("cable")
        if _match_rule_ethernet_cable(haystack):
            rules.append("ethernet_cable")
        if _match_rule_usb_cable(haystack):
            rules.append("usb_cable")
        if _match_rule_coaxial_cable(haystack):
            rules.append("coaxial_cable")
        if "accessories" not in rules:
            rules.append("accessories")

    # De-dupe preserving order
    seen: Set[str] = set()
    out: List[str] = []
    for token in rules:
        if token not in seen:
            out.append(token)
            seen.add(token)
    return out


def collect_matching_rules(product: Dict[str, Any]) -> List[str]:
    """Collect ALL applicable matching-rule tokens; never returns an empty list."""
    haystack = _main_cat_signals(product)
    rules: List[str] = []
    seen: Set[str] = set()
    for token, predicate in _MATCHING_RULE_DETECTORS:
        if token in seen:
            continue
        if predicate(haystack):
            rules.append(token)
            seen.add(token)

    if not rules:
        # Soft Indoor/Outdoor/Accessories tokens from path/title/category content
        for token in _content_fallback_matching_rules(haystack):
            if token not in seen:
                rules.append(token)
                seen.add(token)

    if not rules:
        main_cat = product.get("mainCategory") or assign_main_category(product)
        token = _main_category_fallback_token(str(main_cat))
        rules.append(token)

    return rules


# ---------------------------------------------------------------------------
# Category paths builder
# ---------------------------------------------------------------------------

def build_category_paths(product: Dict[str, Any]) -> str:
    """Format Menu-resolved brand + store category paths for the WooCommerce Categories column."""
    brand_paths = list(product.get("brand_paths") or [])
    category_paths = list(product.get("category_paths") or [])
    if brand_paths or category_paths:
        return format_category_paths(brand_paths + category_paths)
    menu_paths = product.get("menu_category_paths")
    if menu_paths:
        return format_category_paths(menu_paths)
    return ""


# ---------------------------------------------------------------------------
# Tags builder
# ---------------------------------------------------------------------------

def build_tags(product: Dict[str, Any], menu: Optional[MenuTaxonomy] = None) -> str:
    tags: List[str] = []

    brand = product.get("brand", "")
    if brand:
        tags.append(brand)

    mpn = product.get("mpn", "")
    if mpn:
        tags.append(mpn)

    menu_paths = product.get("menu_category_paths") or []
    valid_titles = menu.all_titles if menu else set()
    for path in menu_paths:
        for title in path.split(" > "):
            title = title.strip()
            if not title or title in tags:
                continue
            if menu is None or title in valid_titles:
                tags.append(title)

    return ", ".join(tags)


# ---------------------------------------------------------------------------
# Images builder
# ---------------------------------------------------------------------------

def build_images(product: Dict[str, Any], images: Optional[List[Any]] = None) -> str:
    """Return images as a single comma-separated string."""
    urls = []
    seen = set()
    for img in images if images is not None else product.get("images", []):
        url = img.get("url", "") if isinstance(img, dict) else str(img or "")
        if url and url not in seen:
            seen.add(url)
            urls.append(url)
    return ", ".join(urls)


def _variant_gallery_images(variant: Dict[str, Any]) -> List[Dict[str, Any]]:
    images = [img for img in (variant.get("images") or []) if isinstance(img, dict)]
    gallery_only = [img for img in images if img.get("source", "gallery") == "gallery"]
    return gallery_only or images


# ---------------------------------------------------------------------------
# Physical attributes helpers (weight, dimensions)
# ---------------------------------------------------------------------------

_WEIGHT_NAMES = {"weight", "net weight", "unit weight", "product weight", "gross weight"}
_DIM_NAMES = {"dimensions", "dimension", "size", "product size", "unit size",
              "l × w × h", "l x w x h", "w × d × h", "w x d x h"}


def _extract_weight_kg(specs: List[Dict[str, Any]]) -> str:
    """Scan specification groups for a weight entry and return value in kg."""
    for group in specs:
        for item in group.get("items", []):
            if item.get("name", "").lower().strip() in _WEIGHT_NAMES:
                raw = str(item.get("value", "")).strip()
                m = re.match(r"([\d.,]+)\s*(kg|g|lbs?|oz)?", raw, re.I)
                if m:
                    num = float(m.group(1).replace(",", "."))
                    unit = (m.group(2) or "kg").lower().rstrip("s")
                    if unit == "g":
                        num /= 1000
                    elif unit in ("lb", "lbs"):
                        num *= 0.453592
                    elif unit == "oz":
                        num *= 0.0283495
                    return str(round(num, 3)).rstrip("0").rstrip(".")
                return raw
    return ""


def _extract_dimensions_cm(specs: List[Dict[str, Any]]) -> Tuple[str, str, str]:
    """Scan specification groups for a dimension entry; return (L, W, H) in cm."""
    for group in specs:
        for item in group.get("items", []):
            if item.get("name", "").lower().strip() in _DIM_NAMES:
                raw = str(item.get("value", "")).strip()
                # Patterns: "135 × 75 × 28.5 mm", "135x75x28.5mm", "13.5 x 7.5 x 2.85 cm"
                m = re.match(
                    r"([\d.,]+)\s*[×xX×*]\s*([\d.,]+)\s*[×xX×*]\s*([\d.,]+)\s*(mm|cm|in)?",
                    raw, re.I
                )
                if m:
                    l = float(m.group(1).replace(",", "."))
                    w = float(m.group(2).replace(",", "."))
                    h = float(m.group(3).replace(",", "."))
                    unit = (m.group(4) or "mm").lower()
                    if unit == "mm":
                        l, w, h = l / 10, w / 10, h / 10
                    elif unit in ("in", "inch"):
                        l, w, h = l * 2.54, w * 2.54, h * 2.54
                    fmt = lambda v: str(round(v, 2)).rstrip("0").rstrip(".")
                    return fmt(l), fmt(w), fmt(h)
    return "", "", ""


def _build_extra_attributes(product: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Build a list of visible (non-variation) product attributes from key spec items.
    Each entry: {name, value, visible, global}
    Skips weight/dimension items (those go into dedicated WooCommerce columns).
    """
    SKIP_NAMES = _WEIGHT_NAMES | _DIM_NAMES | {
        "ean", "upc", "gtin", "isbn", "mpn", "sku", "model", "part number",
    }
    # Collect short, single-value spec items worth surfacing as attributes
    attrs: List[Dict[str, str]] = []
    seen_names: set = set()
    for group in product.get("specifications", []):
        for item in group.get("items", []):
            if item.get("is_group"):
                continue
            name = item.get("name", "").strip()
            value = str(item.get("value", "")).strip()
            if not name or not value:
                continue
            if name.lower() in SKIP_NAMES:
                continue
            if name.lower() in seen_names:
                continue
            # Only include concise values (avoid multi-sentence paragraphs as attr values)
            if len(value) > 120 or "\n" in value:
                continue
            seen_names.add(name.lower())
            attrs.append({"name": name, "value": value, "visible": "1", "global": "0"})
    return attrs


# ---------------------------------------------------------------------------
# Product page JSON builder
# ---------------------------------------------------------------------------

PAGE_DISPLAY_KEYS = (
    "breadcrumb", "gallery", "sideBuyBox", "compare", "saveToList", "price",
    "stock", "condition", "delivery", "quantity", "addToCart", "buyNow",
    "keySpecs", "inlineCta", "variations", "linkedTags", "shortDescription",
    "tabs", "tabDescription", "tabSpecs", "tabDocuments", "tabShipping",
    "tabReviews", "tabOverview", "tabInstallation", "tabInBox", "tab3D",
    "tabVideos", "interactiveFeatures", "modelViewer",
    "frequentlyBought", "crossLinks", "promo", "servicesBar",
    "trust", "floatingCta",
)


def _default_page_display() -> Dict[str, Dict[str, bool]]:
    return {key: {"enabled": True, "inherit": True} for key in PAGE_DISPLAY_KEYS}


def _unifi_page_display() -> Dict[str, Dict[str, bool]]:
    display = _default_page_display()
    for key in (
        "tabs", "tabDescription", "tabSpecs", "tabDocuments", "tabOverview",
        "tabInstallation", "tabInBox", "tab3D", "tabVideos", "gallery",
        "interactiveFeatures", "modelViewer", "variations", "frequentlyBought",
    ):
        display[key] = {"enabled": True, "inherit": True}
    display["breadcrumb"] = {"enabled": True, "inherit": True}
    return display


def _format_warranty_months(warranty: str) -> str:
    w = str(warranty or "").strip()
    if not w:
        return ""
    if "month" in w.lower():
        return w
    if w.isdigit():
        return f"{w} months"
    return w


def _safe_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _availability_fields(stock: int) -> Tuple[str, str]:
    if stock > 0:
        return "InStock", "in_stock"
    return "OutOfStock", "out_of_stock"


def _json_categories(product: Dict[str, Any]) -> Tuple[str, List[str], List[str], List[str], List[str], List[str]]:
    """
    Return (
      category leaf,
      flat categories[] (union of both trees for matching),
      brandPaths[],
      categoryPaths[],
      brandCategories[] (brand tree levels only),
      storeCategories[] (category tree levels only),
    ).

    category prefers deepest store-path leaf; falls back to deepest brand-path leaf.
    """
    brand_paths = list(product.get("brand_paths") or [])
    category_paths = list(product.get("category_paths") or [])
    paths = brand_paths + category_paths
    if not paths:
        paths = list(product.get("menu_category_paths") or [])

    brand_categories = _segments_from_paths(brand_paths)
    store_categories = _segments_from_paths(category_paths)

    if paths:
        ordered: List[str] = []
        seen: Set[str] = set()
        for path in sorted(paths, key=lambda p: (-len(p.split(" > ")), p)):
            for seg in path.split(" > "):
                seg = seg.strip()
                if seg and seg not in seen:
                    seen.add(seg)
                    ordered.append(seg)

        category = ""
        if category_paths:
            deepest = max(category_paths, key=lambda p: len(p.split(" > ")))
            category = deepest.split(" > ")[-1].strip()
        elif brand_paths:
            deepest = max(brand_paths, key=lambda p: len(p.split(" > ")))
            category = deepest.split(" > ")[-1].strip()
        elif ordered:
            category = ordered[-1]

        return category, ordered, brand_paths, category_paths, brand_categories, store_categories

    segments: List[str] = []
    brand = product.get("brand", "")
    if brand:
        segments.append(brand)
    segments.extend(product.get("brand_path_titles", []))
    root = product.get("category_root", "")
    if root:
        segments.append(root)
    cat_leaf = product.get("cat_leaf", "")
    if cat_leaf and cat_leaf not in segments:
        segments.append(cat_leaf)
    deduped: List[str] = []
    seen_seg: Set[str] = set()
    for seg in segments:
        if seg and seg not in seen_seg:
            seen_seg.add(seg)
            deduped.append(seg)
    return (deduped[-1] if deduped else "", deduped, [], [], list(deduped), [])


def _json_tags(product: Dict[str, Any]) -> List[str]:
    tags_str = build_tags(product, product.get("_menu_taxonomy"))
    return [t.strip() for t in tags_str.split(",") if t.strip()]


def _is_unifi_output(product: Dict[str, Any]) -> bool:
    return str(product.get("output_format") or "") == "unifi"


def _normalize_video_entries(videos: Any) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    seen: Set[str] = set()
    for v in _as_list(videos):
        if isinstance(v, str):
            url = v.strip()
            poster = ""
            vtype = "youtube" if "youtu" in url.lower() else "upload"
        elif isinstance(v, dict):
            url = str(v.get("url") or "").strip()
            poster = str(v.get("poster") or "")
            vtype = str(v.get("type") or "")
            if not vtype:
                vtype = "youtube" if "youtu" in url.lower() else "upload"
        else:
            continue
        if not url or url in seen:
            continue
        seen.add(url)
        entry: Dict[str, str] = {"url": url, "type": vtype}
        if poster:
            entry["poster"] = poster
        out.append(entry)
    return out


def _json_specifications(specs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    groups: List[Dict[str, Any]] = []
    for group in specs:
        items = group.get("items", [])
        feature_names = [i.get("name", "") for i in items if i.get("name")]
        json_items: List[Dict[str, Any]] = []
        for i in items:
            item: Dict[str, Any] = {
                "name": i.get("name", ""),
                "value": i.get("value", ""),
            }
            if i.get("is_group"):
                item["is_group"] = True
            if i.get("parent"):
                item["parent"] = i.get("parent")
            json_items.append(item)
        groups.append({
            "technology": group.get("technology", ""),
            "features": feature_names,
            "items": json_items,
        })
    return groups


def _json_detailed_description(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    unifi = _is_unifi_output(product)
    sections: List[Dict[str, Any]] = []
    for block in product.get("desc_blocks", []):
        heading = (block.get("heading") or "").strip()
        raw_text = (block.get("text") or "").strip()
        text = _desc_text_for_output(raw_text) if raw_text else ""
        media = block.get("media") or []
        videos = _normalize_video_entries(block.get("videos") or [])
        features = block.get("features") or []
        model_3d = block.get("model_3d")
        if not heading and not text and not media and not videos and not features and not model_3d:
            continue
        if not unifi:
            if text:
                sections.append({"heading": heading, "text": text})
            continue
        section: Dict[str, Any] = {"heading": heading, "text": text}
        if block.get("tab"):
            section["tab"] = block["tab"]
        if media:
            section["media"] = media
        if videos:
            section["videos"] = videos
        if features:
            section["features"] = features
        if model_3d:
            section["model_3d"] = model_3d
        sections.append(section)
    if not unifi:
        return [s for s in sections if s.get("text")]
    return sections


def _json_image_entries(images: Any, title: str = "") -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    for idx, img in enumerate(_as_list(images)):
        if not isinstance(img, dict):
            continue
        url = str(img.get("url") or "").strip()
        if not url:
            continue
        entry: Dict[str, Any] = {
            "url": url,
            "alt": img.get("alt") or img.get("color") or title,
            "type": "main" if idx == 0 else "gallery",
        }
        if img.get("color"):
            entry["color"] = img["color"]
        entries.append(entry)
    return entries


def _combo_3d_model(product: Dict[str, Any], color: str, raw_sku: str) -> Optional[Dict[str, Any]]:
    model = product.get("model_3d")
    if not isinstance(model, dict):
        return None
    color_l = (color or "").strip().lower()
    sku_l = (raw_sku or "").strip().lower()
    match: Optional[Dict[str, Any]] = None
    for variant in _as_list(model.get("variants")):
        if not isinstance(variant, dict):
            continue
        if sku_l and str(variant.get("sku") or "").strip().lower() == sku_l:
            match = variant
            break
        if color_l and str(variant.get("color") or "").strip().lower() == color_l:
            match = variant
    if not match:
        return None
    out: Dict[str, Any] = {
        "sku": match.get("sku") or raw_sku,
        "thumbnail": match.get("thumbnail") or "",
    }
    if match.get("color"):
        out["color"] = match["color"]
    return out


def _json_media(product: Dict[str, Any]) -> Dict[str, Any]:
    gallery = product.get("image_gallery") or []
    json_images: List[Dict[str, Any]] = []
    if gallery:
        for idx, entry in enumerate(gallery):
            variants = entry.get("variants", {})
            url = variants.get("medium") or variants.get("large") or next(iter(variants.values()), "")
            if not url:
                continue
            json_images.append({
                "url": url,
                "alt": entry.get("alt", product.get("title", "")),
                "type": "main" if idx == 0 else "gallery",
            })
    else:
        json_images = _json_image_entries(product.get("images") or [], product.get("title", ""))

    thumbs = product.get("thumbnails") or []
    if not thumbs and json_images:
        thumbs = [{"url": img["url"], "alt": img.get("alt", "")} for img in json_images]

    files = [
        {"title": f.get("title", ""), "url": f.get("url", "")}
        for f in _as_list(product.get("files"))
        if isinstance(f, dict) and f.get("url")
    ]

    return {
        "images": json_images,
        "thumbnails": thumbs,
        "videos": _normalize_video_entries(product.get("videos") or []),
        "files": files,
        "3d_model": (
            product.get("model_3d")
            if isinstance(product.get("model_3d"), dict) and product.get("model_3d", {}).get("url")
            else bool(product.get("has_3d_model"))
        ),
    }


def _json_reviews(product: Dict[str, Any]) -> Dict[str, Any]:
    details = _as_dict(product.get("reviews_details"))
    count = int(product.get("reviews_count") or 0)
    rating = float(product.get("reviews_rating") or 0)
    breakdown = {
        "5_star": int(details.get("rating_5") or 0),
        "4_star": int(details.get("rating_4") or 0),
        "3_star": int(details.get("rating_3") or 0),
        "2_star": int(details.get("rating_2") or 0),
        "1_star": int(details.get("rating_1") or 0),
    }
    if count == 0:
        breakdown = {k: 0 for k in breakdown}

    distribution = {
        "excellent": round(breakdown["5_star"] / count * 100) if count else 0,
        "great": round(breakdown["4_star"] / count * 100) if count else 0,
        "average": round(breakdown["3_star"] / count * 100) if count else 0,
        "poor": round(breakdown["2_star"] / count * 100) if count else 0,
        "bad": round(breakdown["1_star"] / count * 100) if count else 0,
    }

    comments: List[Dict[str, Any]] = []
    for rev in _as_list(product.get("reviews_list")):
        if not isinstance(rev, dict):
            continue
        created = str(rev.get("createdAt", ""))
        comments.append({
            "name": _as_dict(rev.get("customer")).get("name", ""),
            "date": created[:10] if created else "",
            "text": rev.get("review", ""),
            "photos": [],
        })

    return {
        "rating": rating,
        "count": count,
        "source": product.get("reviews_source") or "TrustPilot",
        "distribution": distribution,
        "breakdown": breakdown,
        "comments": comments,
    }


def _json_variations(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    plugs = product.get("available_plugs") or []
    if plugs:
        default = product.get("default_plug") or plugs[0]
        result.append({
            "type": "Plug",
            "options": plugs,
            "default": default if default in plugs else plugs[0],
        })
    seen: Dict[str, List[str]] = {}
    for cv in product.get("color_variants") or []:
        attrs = dict(cv.get("attributes") or {})
        color = str(cv.get("color") or "")
        if color:
            attrs.setdefault("Color", color)
        for key, value in attrs.items():
            if not key or not value:
                continue
            bucket = seen.setdefault(str(key), [])
            if value not in bucket:
                bucket.append(value)
    colors = product.get("available_colors") or [
        v.get("color") for v in product.get("color_variants") or [] if v.get("color")
    ]
    if colors and "Color" not in seen:
        seen["Color"] = list(colors)
    default_attrs = dict((product.get("color_variants") or [{}])[0].get("attributes") or {})
    default_color = product.get("default_color") or (colors[0] if colors else "")
    if default_color:
        default_attrs.setdefault("Color", default_color)
    for type_name, options in seen.items():
        if not options:
            continue
        default = str(default_attrs.get(type_name) or options[0])
        result.append({
            "type": type_name,
            "options": options,
            "default": default if default in options else options[0],
        })
    return result


def _json_variation_combinations(
    product: Dict[str, Any],
    base_price: Optional[float],
    old_price: Optional[float],
) -> List[Dict[str, Any]]:
    ean = product.get("ean", "")
    uid = product.get("uid", "")
    base_sku = f"{SKU_PREFIX}-{ean}" if ean else f"{SKU_PREFIX}-{uid}"
    plugs = product.get("available_plugs") or []
    color_vars = product.get("color_variants") or []
    conditions = product.get("condition_options") or ["new"]
    combos: List[Dict[str, Any]] = []

    if color_vars:
        for cv in color_vars:
            raw_sku = str(cv.get("sku") or "").strip()
            color = str(cv.get("color") or "")
            sku = f"{SKU_PREFIX}-{raw_sku}" if raw_sku else f"{base_sku}-{color.lower()}"
            price = _safe_float(cv.get("price"))
            if price is None:
                price = base_price
            combo_images = _json_image_entries(
                [img for img in (cv.get("images") or []) if img.get("source", "gallery") == "gallery"]
                + [img for img in (cv.get("images") or []) if img.get("source", "gallery") != "gallery"],
                color or product.get("title", ""),
            )
            combo_3d = _combo_3d_model(product, color, raw_sku)
            for cond in conditions:
                combo: Dict[str, Any] = {
                    "sku": sku,
                    "Condition": cond,
                    "price": price,
                    "old_price": old_price,
                    "images": combo_images,
                    "files": [],
                }
                attrs = dict(cv.get("attributes") or {})
                if color:
                    attrs.setdefault("Color", color)
                combo.update(attrs)
                if color:
                    combo["Color"] = color
                if combo_3d:
                    combo["3d_model"] = combo_3d
                if plugs:
                    combo["Plug"] = plugs[0]
                combos.append(combo)
        return combos

    if plugs:
        for plug in plugs:
            for cond in conditions:
                combo = {
                    "sku": f"{base_sku}-{plug.lower()}",
                    "Plug": plug,
                    "Condition": cond,
                    "price": base_price,
                    "old_price": old_price,
                }
                combos.append(combo)
    else:
        for cond in conditions:
            combos.append({
                "sku": base_sku,
                "Condition": cond,
                "price": base_price,
                "old_price": old_price,
            })
    return combos


def _json_shipping(product: Dict[str, Any]) -> Dict[str, Any]:
    specs = product.get("specifications", [])
    weight = _extract_weight_kg(specs)
    length, width, height = _extract_dimensions_cm(specs)
    dimensions = ""
    if length or width or height:
        parts = [p for p in (length, width, height) if p]
        dimensions = " x ".join(parts) + " cm" if parts else ""
    return {
        "options": [{
            "class": "Standard",
            "origin": product.get("country_of_origin", ""),
            "weight": f"{weight} kg" if weight else "",
            "dimensions": dimensions,
        }],
    }


def load_json_template() -> Dict[str, Any]:
    if not SAMPLE_JSON_TEMPLATE_PATH:
        return {}
    path = Path(SAMPLE_JSON_TEMPLATE_PATH)
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def woocommerce_slug(title: str) -> str:
    """
    WordPress/WooCommerce post slug from product Name (sanitize_title_with_dashes).
    Matches native WC CSV import: dots and slashes become hyphens before other cleanup.
    """
    if not title:
        return ""
    text = re.sub(r"<[^>]+>", "", title)
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"&[^;\s]+;", "", text)
    text = text.replace(".", "-")
    text = text.replace("/", "-")
    text = re.sub(r"[^a-z0-9\s\-_]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def resolve_product_slug(product: Dict[str, Any]) -> str:
    """WooCommerce-aligned slug from product title (same source as CSV Name)."""
    return woocommerce_slug(str(product.get("title", "") or ""))


def build_product_json(product: Dict[str, Any]) -> Dict[str, Any]:
    """Build product page JSON matching template-json.json and product.schema.json."""
    template = load_json_template()
    title = product.get("title", "")
    slug = product.get("slug") or resolve_product_slug(product)
    short_desc = product.get("short_description", "")
    category, categories, brand_paths, category_paths, brand_categories, store_categories = (
        _json_categories(product)
    )
    tags = _json_tags(product)
    availability, stock_status = _availability_fields(int(product.get("stock") or 0))
    base_price = _safe_float(product.get("regular_price"))
    old_price = product.get("old_price")
    if old_price is None:
        old_price = _safe_float(product.get("old_price"))
    currency = product.get("currency", "USD")

    # Prefer folder-derived brand when product.brand empty
    brand_value = product.get("brand", "") or (
        brand_paths[0].split(" > ")[0] if brand_paths else ""
    )

    payload: Dict[str, Any] = {
        "slug": slug,
        "getic_uid": product.get("uid", ""),
        "id": str(product.get("id", "")),
        "productTitle": title,
        "name": title,
        "title": title,
        "title_extended": product.get("title_extended") or None,
        "short_description": short_desc,
        "description": short_desc,
        "detailed_description": _json_detailed_description(product),
        "brand": brand_value,
        "mainCategory": product.get("mainCategory") or "Other",
        "matchingRules": list(product.get("matchingRules") or collect_matching_rules(product)),
        "brandPaths": brand_paths,
        "categoryPaths": category_paths,
        "brandCategories": brand_categories,
        "storeCategories": store_categories,
        "category": category or None,
        "categories": categories,
        "tags": tags,
        "mpn": product.get("mpn", ""),
        "manufacturer_part_number": product.get("mpn", ""),
        "ean": product.get("ean", ""),
        "warranty": _format_warranty_months(product.get("warranty", "")),
        "condition_options": product.get("condition_options") or ["new"],
        "plug_options": product.get("available_plugs") or [],
        "media": _json_media(product),
        "price": {
            "value": base_price if base_price is not None else 0,
            "currency": currency,
            "discount": None,
        },
        "old_price": old_price,
        "availability": availability,
        "stock_status": stock_status,
        "variations": _json_variations(product),
        "variation_combinations": _json_variation_combinations(product, base_price, old_price),
        "specifications": _json_specifications(product.get("specifications", [])),
        "documents": [
            {"title": f.get("title", ""), "url": f.get("url", "")}
            for f in product.get("files", [])
            if f.get("url")
        ],
        "shipping": _json_shipping(product),
        "delivery_options": [],
        "reviews": _json_reviews(product),
        "bought_together": product.get("bought_together") or [],
        "certifications": product.get("certifications") or [],
        "faq": [],
        "localization": {
            "canonical_slug": slug,
            "source_locale": "en",
            "translation_status": "complete",
            "uses_source_fallback": False,
        },
        "page_display": _unifi_page_display() if _is_unifi_output(product) else _default_page_display(),
        "product_cta": {
            "enabled": False,
            "placements": {"inline": False, "floating": False, "card": False},
        },
        "add_to_cart": {
            "enabled": True,
            "behavior": "stub",
            "variant": "primary",
            "size": "lg",
            "fullWidth": True,
        },
        "buy_now_slug": slug,
        "promo": {"enabled": False},
        "trust": {"enabled": False},
    }

    # Merge template defaults (structure hints) without overwriting populated values
    merged: Dict[str, Any] = {}
    for key, val in template.items():
        if key == "stock_stat":
            continue
        if key not in payload or payload[key] in (None, "", [], {}):
            merged[key] = val
    merged.update(payload)
    return merged


def _companion_json_path(csv_path: Path) -> Path:
    if csv_path.name.lower().endswith(".csv"):
        return csv_path.parent / f"{csv_path.name[:-4]}.json"
    return csv_path.with_suffix(".json")


def write_product_json(output_path: Path, data: Dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------------------------------------------------------------------------
# Bought-together: same brand + overlapping categories
# ---------------------------------------------------------------------------

BOUGHT_TOGETHER_CAP = 8


def _bought_together_item_from_product(data: Dict[str, Any]) -> Dict[str, Any]:
    slug = str(data.get("slug") or "").strip()
    name = str(data.get("name") or data.get("productTitle") or data.get("title") or slug)
    price_obj = data.get("price") if isinstance(data.get("price"), dict) else {}
    price = price_obj.get("value") if isinstance(price_obj, dict) else data.get("price")
    currency = (
        price_obj.get("currency")
        if isinstance(price_obj, dict)
        else data.get("currency")
    ) or "USD"
    images: List[Any] = []
    media = data.get("media") if isinstance(data.get("media"), dict) else {}
    if isinstance(media, dict):
        images = list(media.get("images") or [])
    image = ""
    if images and isinstance(images[0], dict):
        image = str(images[0].get("url") or "")
    elif images and isinstance(images[0], str):
        image = images[0]
    return {
        "name": name,
        "title": name,
        "slug": slug,
        "url": f"/product/{slug}" if slug else "",
        "price": price if price is not None else None,
        "currency": currency,
        "mpn": str(data.get("mpn") or ""),
        "availability": str(data.get("availability") or "InStock"),
        "image": image,
    }


def _category_overlap_score(a: Dict[str, Any], b: Dict[str, Any]) -> int:
    """Higher score = more shared taxonomy leaves (prefer deepest shared segments)."""
    a_cats = {str(c).strip().lower() for c in (a.get("categories") or []) if c}
    b_cats = {str(c).strip().lower() for c in (b.get("categories") or []) if c}
    shared = a_cats & b_cats

    def leaves(paths: Any) -> Set[str]:
        out: Set[str] = set()
        for p in paths or []:
            parts = str(p).split(" > ")
            if parts:
                out.add(parts[-1].strip().lower())
        return out

    if not shared:
        shared = leaves(a.get("brandPaths") or a.get("brand_paths")) & leaves(
            b.get("brandPaths") or b.get("brand_paths")
        )
        shared |= leaves(a.get("categoryPaths") or a.get("category_paths")) & leaves(
            b.get("categoryPaths") or b.get("category_paths")
        )
    if not shared:
        return 0
    return len(shared) * 10 + max(len(s) for s in shared)


def fill_bought_together_from_siblings(json_paths: List[Path]) -> int:
    """
    Second pass: fill bought_together with same-brand siblings that share category
    overlap. Keep scraped items first; cap at BOUGHT_TOGETHER_CAP.
    Returns number of files updated.
    """
    if len(json_paths) < 2:
        return 0

    products: List[Tuple[Path, Dict[str, Any]]] = []
    for path in json_paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                products.append((path, data))
        except (OSError, json.JSONDecodeError) as e:
            print(f"  Warning: skip bought_together for {path.name}: {e}")

    updated = 0
    for path, data in products:
        brand = str(data.get("brand") or "").strip()
        slug = str(data.get("slug") or "").strip()
        if not brand:
            continue

        scraped = [
            item
            for item in (data.get("bought_together") or [])
            if isinstance(item, dict)
            and (item.get("name") or item.get("slug") or item.get("url"))
        ]
        scraped_slugs = {
            str(item.get("slug") or "").strip().lower()
            for item in scraped
            if item.get("slug")
        }
        scraped_names = {
            str(item.get("name") or item.get("title") or "").strip().lower()
            for item in scraped
            if item.get("name") or item.get("title")
        }

        candidates: List[Tuple[int, Dict[str, Any]]] = []
        for other_path, other in products:
            if other_path == path:
                continue
            other_brand = str(other.get("brand") or "").strip()
            if normalize_menu_name(other_brand) != normalize_menu_name(brand):
                continue
            other_slug = str(other.get("slug") or "").strip()
            if other_slug and other_slug.lower() == slug.lower():
                continue
            score = _category_overlap_score(data, other)
            if score <= 0:
                continue
            item = _bought_together_item_from_product(other)
            if item.get("slug") and str(item["slug"]).lower() in scraped_slugs:
                continue
            if item.get("name") and str(item["name"]).lower() in scraped_names:
                continue
            candidates.append((score, item))

        candidates.sort(key=lambda t: (-t[0], str(t[1].get("name") or "")))
        remaining = max(0, BOUGHT_TOGETHER_CAP - len(scraped))
        filled = scraped + [item for _, item in candidates[:remaining]]
        if filled != (data.get("bought_together") or []):
            data["bought_together"] = filled
            write_product_json(path, data)
            updated += 1

    return updated


# ---------------------------------------------------------------------------
# Main CSV row builder
# ---------------------------------------------------------------------------

def build_csv_rows(product: Dict[str, Any]) -> List[Dict[str, str]]:
    headers = load_csv_headers()

    def empty_row() -> Dict[str, str]:
        return {h: "" for h in headers}

    ean = product.get("ean", "")
    uid = product.get("uid", "")
    base_sku = f"{SKU_PREFIX}-{ean}" if ean else f"{SKU_PREFIX}-{uid}"

    title = product.get("title", "")
    short_description = product.get("short_description", "")
    full_description = create_description_html(product)

    mpn = product.get("mpn", "")
    brand = product.get("brand", "")
    warranty = product.get("warranty", "")
    country_of_origin = product.get("country_of_origin", "")
    product_id = product.get("id", "")
    regular_price = product.get("regular_price", "")
    stock = product.get("stock", 0)

    categories = build_category_paths(product)
    tags = build_tags(product, product.get("_menu_taxonomy"))
    default_color = str(product.get("default_color") or "")
    parent_images = [
        img for img in product.get("images", [])
        if isinstance(img, dict) and (
            not img.get("color") or str(img.get("color") or "") == default_color or not default_color
        )
    ]
    images_str = build_images(product, parent_images or None)

    # Only use actual plug data — never default to a standard list
    available_plugs: List[str] = product.get("available_plugs", [])
    has_plugs = bool(available_plugs)
    color_variants: List[Dict[str, Any]] = product.get("color_variants") or []
    available_colors: List[str] = product.get("available_colors") or [
        v.get("color") for v in color_variants if v.get("color")
    ]
    has_colors = bool(available_colors)
    is_variable = has_plugs or has_colors

    # Physical attributes from specs
    specs = product.get("specifications", [])
    weight_kg = _extract_weight_kg(specs)
    length_cm, width_cm, height_cm = _extract_dimensions_cm(specs)

    # Extra visible attributes (non-variation, non-weight/dim) from specs
    extra_attrs = _build_extra_attributes(product)
    if has_colors:
        extra_attrs = [ea for ea in extra_attrs if ea["name"].lower() != "color"]

    # Build the ordered attribute slot list for the parent row:
    # Color / Plug first as variation attributes, then extra spec attributes
    attr_slots: List[Dict[str, str]] = []
    if has_colors:
        attr_slots.append({
            "name": "Color",
            "value": " | ".join(available_colors),
            "visible": "1",
            "global": "0",
            "variation": "1",
        })
    if has_plugs:
        attr_slots.append({
            "name": "Plug",
            "value": " | ".join(available_plugs),
            "visible": "1",
            "global": "0",
            "variation": "1",
        })
    for ea in extra_attrs:
        attr_slots.append({
            "name": ea["name"],
            "value": ea["value"],
            "visible": "1",
            "global": "0",
            "variation": "0",
        })

    def apply_meta(row: Dict[str, str]) -> None:
        row["Meta: _getic_product_id"] = product_id
        row["Meta: _getic_uid"] = uid
        row["Meta: _mpn"] = mpn
        row["Meta: _ean"] = ean
        row["Meta: _brand"] = brand
        row["Meta: _warranty_months"] = warranty
        row["Meta: _country_of_origin"] = country_of_origin
        row["Meta: _main_category"] = product.get("mainCategory") or "Other"
        rules = product.get("matchingRules") or collect_matching_rules(product)
        row["Meta: _matching_rules"] = ", ".join(rules)
        row["Meta: _brand_paths"] = format_category_paths(product.get("brand_paths") or [])
        row["Meta: _category_paths"] = format_category_paths(product.get("category_paths") or [])
        row["Meta: _output_format"] = product.get("output_format") or "default"
        model_3d = product.get("model_3d") if isinstance(product.get("model_3d"), dict) else {}
        row["Meta: _3d_model_url"] = str(model_3d.get("url") or "")
        video_urls = [v["url"] for v in _normalize_video_entries(product.get("videos") or [])]
        row["Meta: _product_videos"] = ", ".join(video_urls)

    def apply_attrs(row: Dict[str, str], slots: List[Dict[str, str]]) -> None:
        """Write attribute slots into the numbered Attribute N columns."""
        for i, slot in enumerate(slots, start=1):
            prefix = f"Attribute {i}"
            name_col = f"{prefix} name"
            val_col = f"{prefix} value(s)"
            vis_col = f"{prefix} visible"
            glb_col = f"{prefix} global"
            if name_col not in row:
                break  # template doesn't have this attribute slot
            row[name_col] = slot["name"]
            row[val_col] = slot["value"]
            row[vis_col] = slot["visible"]
            row[glb_col] = slot["global"]

    rows = []

    # ------------------------------------------------------------------
    # Parent row  (variable when plugs exist, otherwise simple)
    # ------------------------------------------------------------------
    parent = empty_row()
    parent["Type"] = "variable" if is_variable else "simple"
    parent["SKU"] = base_sku
    parent["GTIN, UPC, EAN, or ISBN"] = ean
    parent["Name"] = title
    parent["Published"] = "1"
    parent["Is featured?"] = "0"
    parent["Visibility in catalog"] = "visible"
    ean_label = f"EAN: {ean}\n" if ean else ""
    parent["Short description"] = ean_label + short_description
    parent["Description"] = full_description
    parent["Tax status"] = "taxable"
    parent["Tax class"] = ""
    parent["In stock?"] = "1" if stock > 0 else "0"
    parent["Stock"] = str(stock) if stock else "3"
    parent["Backorders allowed?"] = "0"
    parent["Sold individually?"] = "0"
    parent["Weight (kg)"] = weight_kg
    parent["Length (cm)"] = length_cm
    parent["Width (cm)"] = width_cm
    parent["Height (cm)"] = height_cm
    parent["Allow customer reviews?"] = "1"
    parent["Regular price"] = regular_price
    parent["Sale price"] = ""
    parent["Categories"] = categories
    parent["Tags"] = tags
    parent["Images"] = images_str
    parent["Position"] = "0"
    parent["Brands"] = brand
    apply_attrs(parent, attr_slots)
    apply_meta(parent)

    rows.append(parent)

    # ------------------------------------------------------------------
    # Variation rows — plugs and/or UniFi color variants
    # ------------------------------------------------------------------
    if has_colors:
        for idx, cv in enumerate(color_variants or [{"color": c} for c in available_colors], start=1):
            color = str(cv.get("color") or "").strip()
            if not color:
                continue
            raw_sku = str(cv.get("sku") or "").strip()
            var_sku = f"{SKU_PREFIX}-{raw_sku}" if raw_sku else f"{base_sku}-{color.lower()}"
            var_price = cv.get("price") or regular_price
            var_stock = cv.get("stock") if cv.get("stock") is not None else stock
            var = empty_row()
            var["Type"] = "variation"
            var["SKU"] = var_sku
            var["Name"] = f"{title} – {color}"
            var["Published"] = "1"
            var["Is featured?"] = "0"
            var["Visibility in catalog"] = "visible"
            var["Tax status"] = "taxable"
            var["Tax class"] = "parent"
            var["In stock?"] = "1" if int(var_stock or 0) > 0 else "0"
            var["Stock"] = str(var_stock) if var_stock else "3"
            var["Backorders allowed?"] = "0"
            var["Sold individually?"] = "0"
            var["Allow customer reviews?"] = "0"
            var["Regular price"] = str(var_price)
            var["Sale price"] = ""
            var["Parent"] = base_sku
            var["Position"] = str(idx)
            var["Attribute 1 name"] = "Color"
            var["Attribute 1 value(s)"] = color
            var["Attribute 1 visible"] = ""
            var["Attribute 1 global"] = "0"
            var["Images"] = build_images(product, _variant_gallery_images(cv))
            apply_meta(var)
            rows.append(var)
    elif has_plugs:
        for idx, plug in enumerate(available_plugs, start=1):
            var = empty_row()
            var["Type"] = "variation"
            var["SKU"] = f"{base_sku}-{plug.lower()}"
            var["Name"] = f"{title} – {plug}"
            var["Published"] = "1"
            var["Is featured?"] = "0"
            var["Visibility in catalog"] = "visible"
            var["Tax status"] = "taxable"
            var["Tax class"] = "parent"
            var["In stock?"] = "1"
            var["Stock"] = str(stock) if stock else "3"
            var["Backorders allowed?"] = "0"
            var["Sold individually?"] = "0"
            var["Allow customer reviews?"] = "0"
            var["Regular price"] = regular_price
            var["Sale price"] = ""
            var["Parent"] = base_sku
            var["Position"] = str(idx)
            # Variation row only needs the variation attribute (Plug), not extras
            var["Attribute 1 name"] = "Plug"
            var["Attribute 1 value(s)"] = plug
            var["Attribute 1 visible"] = ""
            var["Attribute 1 global"] = "0"
            apply_meta(var)
            rows.append(var)

    return rows


# ---------------------------------------------------------------------------
# Output writer
# ---------------------------------------------------------------------------

def unique_output_path(path: Path) -> Tuple[Path, bool]:
    """
    If path already exists, return the next free name: stem (1).csv, stem (2).csv, ...
    Returns (resolved_path, was_renamed).
    Directories are ignored so a folder named "output" is not treated as a taken file.
    """
    if not path.exists() or path.is_dir():
        return path, False
    stem = _output_stem(path)
    suffix = path.suffix.lower() if path.suffix else ".csv"
    parent = path.parent
    n = 1
    while True:
        candidate = parent / f"{stem} ({n}){suffix}"
        if not candidate.exists():
            return candidate, True
        n += 1


# PHP fileinfo (and libmagic generally) scans the head of a file for these
# markers and reports text/html, which makes WordPress refuse the upload with
# "Sorry, you are not allowed to upload this file type."
MIME_SNIFF_WINDOW = 4096
HTML_SNIFF_MARKERS = (
    b"<!doctype html",
    b"<html",
    b"<head",
    b"<title",
    b"<script",
    b"<style",
    b"<table",
    b"<a href=",
)


def _render_csv_text(headers: List[str], rows: List[Dict[str, str]]) -> str:
    buf = io.StringIO(newline="")
    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue()


def _html_marker_offset(data: bytes) -> int:
    """Byte offset of the first HTML marker inside the sniff window, else -1."""
    window = data[:MIME_SNIFF_WINDOW].lower()
    hits = [pos for pos in (window.find(m) for m in HTML_SNIFF_MARKERS) if pos >= 0]
    return min(hits) if hits else -1


def _keep_markup_out_of_sniff_window(
    headers: List[str],
    rows: List[Dict[str, str]],
    text: str,
) -> str:
    """Push embedded markup past the sniff window so the file reads as text."""
    if not rows or "Description" not in headers:
        return text
    offset = _html_marker_offset(text.encode("utf-8"))
    if offset < 0:
        return text
    pad = "." * (MIME_SNIFF_WINDOW - offset + 64)
    rows[0]["Description"] = f"<!--{pad}-->" + rows[0].get("Description", "")
    return _render_csv_text(headers, rows)


def write_csv(output_path: Path, rows: List[Dict[str, str]]) -> None:
    headers = load_csv_headers()
    cleaned = [
        {k: ("" if v is None else strip_control_chars(str(v))) for k, v in row.items()}
        for row in rows
    ]
    text = _render_csv_text(headers, cleaned)
    text = _keep_markup_out_of_sniff_window(headers, cleaned, text)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as f:
        f.write(text)


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

def process_single(
    input_path: Path,
    output_path: Path,
    force_json: bool = False,
    *,
    brand_name: Optional[str] = None,
    folder_segments: Optional[List[str]] = None,
    brand_folder_segments: Optional[List[str]] = None,
    category_folder_segments: Optional[List[str]] = None,
    menu: Optional[MenuTaxonomy] = None,
    output_format: str = "auto",
) -> Path:
    print(f"Processing: {input_path.name}")
    product, parser_name = load_and_normalize(input_path, force_json)
    product = sanitize_product_text(product)
    print(f"  Parser: {parser_name}")

    resolved_format = output_format
    if resolved_format == "auto":
        resolved_format = "unifi" if parser_name == "unifi_store" else "default"
    product["output_format"] = resolved_format
    print(f"  Format: {resolved_format}")

    if not product.get("images") and not product.get("specifications"):
        print("  Warning: sparse extraction (no images or specifications)")

    b_folder = list(brand_folder_segments or [])
    c_folder = list(category_folder_segments or [])
    segments = folder_segments if folder_segments is not None else []
    bname = brand_name or product.get("brand", "") or (b_folder[0] if b_folder else "") or input_path.parent.name
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
        # Menu optional: still classify purely from folders
        product["brand_paths"] = folder_segments_to_prefixed_paths(b_folder)
        product["category_paths"] = folder_segments_to_prefixed_paths(c_folder)
        product["menu_category_paths"] = sorted(
            set(product["brand_paths"]) | set(product["category_paths"]),
            key=lambda p: (len(p.split(" > ")), p),
        )

    product["mainCategory"] = assign_main_category(product)
    product["matchingRules"] = collect_matching_rules(product)
    print(f"  Main Category: {product['mainCategory']}")
    if product["matchingRules"]:
        print(f"  Matching Rules: {', '.join(product['matchingRules'])}")

    product["slug"] = resolve_product_slug(product)

    rows = build_csv_rows(product)
    output_path, renamed = unique_output_path(output_path)
    if renamed:
        print(f"  Note: output name taken; writing to {output_path.name}")
    write_csv(output_path, rows)

    json_path = _companion_json_path(output_path)
    json_path, json_renamed = unique_output_path(json_path)
    if json_renamed:
        print(f"  Note: JSON name taken; writing to {json_path.name}")
    write_product_json(json_path, build_product_json(product))

    print(
        f"  OK: {len(rows)} CSV rows (1 parent + {len(rows) - 1} variations) "
        f"-> {output_path.name}, {json_path.name}"
    )
    return json_path


def process_directory_tree(
    input_root: Path,
    output_dir: Path,
    menu: MenuTaxonomy,
    force_json: bool,
    brand_override: Optional[str],
    output_format: str = "auto",
) -> None:
    input_root = input_root.resolve()
    output_dir = output_dir.resolve()
    jobs = discover_product_jobs(input_root, output_dir, menu, brand_override)
    if not jobs:
        print(f"ERROR: No product files found under {input_root}")
        return

    brands_root, categories_root = _detect_dual_taxonomy_roots(input_root)
    if brands_root is not None or categories_root is not None:
        mode = "dual-taxonomy (Brands/ + Categories/)"
    else:
        multi, _ = _detect_layout(input_root, menu, brand_override)
        mode = "multi-brand" if multi else "single-brand"
    print(f"Directory mode ({mode}): {len(jobs)} product file(s)")
    ok = 0
    json_paths: List[Path] = []
    for i, job in enumerate(jobs, 1):
        try:
            print(f"\n[{i}/{len(jobs)}] {job.input_path.relative_to(input_root)}")
            json_path = process_single(
                job.input_path,
                job.output_path,
                force_json,
                brand_name=job.brand_name,
                folder_segments=job.folder_segments,
                brand_folder_segments=job.brand_folder_segments,
                category_folder_segments=job.category_folder_segments,
                menu=menu,
                output_format=output_format,
            )
            json_paths.append(json_path)
            ok += 1
        except Exception as e:
            print(f"  ERROR: {e}")
    print(f"\nOK: {ok}/{len(jobs)} processed successfully")
    if len(json_paths) >= 2:
        n = fill_bought_together_from_siblings(json_paths)
        print(f"Bought together: updated {n} product JSON file(s)")


def process_batch(
    pattern: str,
    output_dir: Path,
    force_json: bool = False,
    menu: Optional[MenuTaxonomy] = None,
    output_format: str = "auto",
) -> None:
    p = Path(pattern)
    files = sorted(p.parent.glob(p.name))
    if not files:
        print(f"ERROR: No files found: {pattern}")
        return
    print(f"Found {len(files)} file(s)")
    ok = 0
    json_paths: List[Path] = []
    for i, fp in enumerate(files, 1):
        try:
            out = output_dir / _product_csv_path(fp).name
            print(f"\n[{i}/{len(files)}] {fp.name}")
            json_path = process_single(
                fp, out, force_json, menu=menu, output_format=output_format
            )
            json_paths.append(json_path)
            ok += 1
        except Exception as e:
            print(f"  ERROR: {e}")
    print(f"\nOK: {ok}/{len(files)} processed successfully")
    if len(json_paths) >= 2:
        n = fill_bought_together_from_siblings(json_paths)
        print(f"Bought together: updated {n} product JSON file(s)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert product pages (HTML/JSON) to WooCommerce import CSV",
    )
    parser.add_argument(
        "input",
        help="Input file, directory, or glob pattern (e.g. input/ or input/*)",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Output CSV file, or a directory (e.g. output/) to write <input-name>.csv into",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Force raw JSON parsing (default: auto-detect from file content)",
    )
    parser.add_argument("--batch", action="store_true", help="Batch mode (output = directory)")
    parser.add_argument(
        "--sample-template",
        default="template.csv",
        help="WooCommerce CSV template with headers (default: template.csv)",
    )
    parser.add_argument(
        "--json-template",
        default="template-json.json",
        help="Product page JSON template (default: template-json.json)",
    )
    parser.add_argument("--prefix", default="brt", help="SKU prefix (default: brt)")
    parser.add_argument(
        "--menu-dir",
        default="Menu",
        help="Menu taxonomy directory (default: Menu)",
    )
    parser.add_argument(
        "--format",
        choices=["default", "unifi", "auto"],
        default="auto",
        help=(
            "Output format: default (WooCommerce), unifi (rich UniFi layout), "
            "auto (unifi when UniFi HTML is detected; default)"
        ),
    )
    parser.add_argument(
        "--brand",
        default=None,
        help="Brand name for single-brand directory input when folder name differs from Menu",
    )

    args = parser.parse_args()

    global SAMPLE_CSV_PATH, SAMPLE_JSON_TEMPLATE_PATH, SKU_PREFIX
    SAMPLE_CSV_PATH = args.sample_template
    SAMPLE_JSON_TEMPLATE_PATH = args.json_template
    SKU_PREFIX = args.prefix

    if not Path(SAMPLE_CSV_PATH).exists():
        print(f"ERROR: Template not found: {SAMPLE_CSV_PATH}")
        return 1

    menu: Optional[MenuTaxonomy] = None
    menu_path = Path(args.menu_dir)
    if menu_path.is_dir():
        try:
            menu = MenuTaxonomy.load(menu_path)
            print(
                f"Menu loaded: {len(menu.brand_trees)} brand tree(s), "
                f"{len(menu.store_trees)} store tree(s), {len(menu.all_paths)} path(s)"
            )
        except Exception as e:
            print(f"ERROR: Failed to load Menu from {menu_path}: {e}")
            return 1
    elif args.menu_dir != "Menu" or Path(args.input).is_dir():
        print(f"ERROR: Menu directory not found: {menu_path}")
        return 1

    inp = Path(args.input)
    is_glob = "*" in args.input or "?" in args.input
    is_batch = args.batch or is_glob
    out = Path(args.output)
    out_is_dir = _is_output_directory(out, args.output)

    if inp.is_dir():
        if not out_is_dir:
            print("ERROR: For directory input, output must be a directory.")
            return 1
        if menu is None:
            print("ERROR: Directory batch requires --menu-dir (default: Menu).")
            return 1
        process_directory_tree(
            inp.resolve(),
            out.resolve(),
            menu,
            args.json,
            args.brand,
            output_format=args.format,
        )
        return 0

    if is_batch:
        if not out_is_dir:
            print("ERROR: In batch mode, output must be a directory.")
            return 1
        process_batch(args.input, out, args.json, menu=menu, output_format=args.format)
    else:
        if not inp.exists():
            print(f"ERROR: Input not found: {inp}")
            return 1
        if out_is_dir:
            out.mkdir(parents=True, exist_ok=True)
            out = out / _product_csv_path(inp).name
        elif not str(out).lower().endswith(".csv"):
            out = out.with_suffix(".csv")
        process_single(inp, out, args.json, menu=menu, output_format=args.format)

    return 0


if __name__ == "__main__":
    sys.exit(main())
