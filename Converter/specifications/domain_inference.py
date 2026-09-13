from __future__ import annotations

from typing import Any, Dict, List, Optional

RADIO_BRANDS = frozenset({"inrico", "belfone", "motorola", "hytera", "kenwood", "icom"})
RADIO_CATEGORY_HINTS = (
    "two-way radio",
    "two way radio",
    "walkie talkie",
    "dmr",
    "poc radio",
    "handheld radio",
)
NETWORKING_CATEGORY_HINTS = (
    "access point",
    "router",
    "switch",
    "ethernet",
    "wifi",
    "wi-fi",
    "network",
    "gateway",
)
CAMERA_CATEGORY_HINTS = ("camera", "nvr", "surveillance", "bullet", "dome", "ptz")


def _haystack(product: Dict[str, Any]) -> str:
    parts: List[str] = []
    for key in ("mainCategory", "category", "cat_leaf", "title", "brand", "output_format"):
        val = product.get(key)
        if val:
            parts.append(str(val))
    for path in product.get("cat_path_titles") or product.get("category_paths") or []:
        parts.append(str(path))
    for path in product.get("brand_path_titles") or product.get("brand_paths") or []:
        parts.append(str(path))
    return " ".join(parts).lower()


def infer_product_domain(product: Dict[str, Any]) -> Optional[str]:
    text = _haystack(product)
    brand = str(product.get("brand") or "").lower()

    if any(h in text for h in RADIO_CATEGORY_HINTS) or brand in RADIO_BRANDS:
        return "radio"
    if any(h in text for h in CAMERA_CATEGORY_HINTS):
        return "camera"
    if product.get("output_format") == "unifi" or any(h in text for h in NETWORKING_CATEGORY_HINTS):
        return "networking"
    if product.get("output_format") == "mikrotik" or "routeros" in text or "mikrotik" in text:
        return "networking"
    if "security systems" in text and "radio" not in text:
        return "security"
    return None
