from __future__ import annotations

import copy
from typing import Any, Dict, List, Optional

from .domain_inference import infer_product_domain
from .matcher import match_specification
from .registry import get_spec, load_registry
from .types import CanonicalSpecRecord, DiagnosticSpec, NormalizedSpecResult


def _copy_source_groups(groups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return copy.deepcopy(groups)


def _iter_raw_items(groups: List[Dict[str, Any]]):
    for group in groups:
        technology = str(group.get("technology") or group.get("name") or "Specifications")
        for item in group.get("items") or []:
            if not isinstance(item, dict):
                continue
            if item.get("is_group"):
                continue
            name = str(item.get("name") or "").strip()
            value = str(item.get("value") or "").strip()
            if not name and not value:
                continue
            yield technology, item, name, value


def _build_legacy_compat(canonical_flat: Dict[str, CanonicalSpecRecord]) -> List[Dict[str, Any]]:
    registry = load_registry()
    by_group: Dict[str, List[Dict[str, Any]]] = {}
    order: List[str] = []

    for spec_id, record in canonical_flat.items():
        spec = get_spec(spec_id) or {}
        display = spec.get("display") or {}
        group_name = str(display.get("group") or spec.get("domain") or "Specifications")
        if group_name not in by_group:
            by_group[group_name] = []
            order.append(group_name)
        entry: Dict[str, Any] = {
            "name": record.name or spec.get("name") or spec_id,
            "value": record.value,
            "id": spec_id,
            "source": {
                "group": record.source_group,
                "label": record.source_label,
            },
            "confidence": record.confidence,
            "score": record.score,
        }
        by_group[group_name].append(entry)

    domain_order = registry.get("domain_order") or []
    order.sort(key=lambda g: next((i for i, d in enumerate(domain_order) if g.lower().startswith(d)), 999))

    return [
        {"technology": group, "groupId": group.lower().replace(" ", "_"), "items": by_group[group]}
        for group in order
    ]


def normalize_specifications(
    raw_groups: List[Dict[str, Any]],
    *,
    product: Optional[Dict[str, Any]] = None,
    product_domain: Optional[str] = None,
) -> NormalizedSpecResult:
    source_grouped = _copy_source_groups(raw_groups)
    product = product or {}
    inferred = product_domain or infer_product_domain(product)

    canonical_flat: Dict[str, CanonicalSpecRecord] = {}
    unmapped: List[DiagnosticSpec] = []
    ambiguous: List[DiagnosticSpec] = []

    for technology, _item, name, value in _iter_raw_items(raw_groups):
        match, candidates, reason = match_specification(
            source_group=technology,
            source_label=name,
            value=value,
            product_domain=inferred,
        )
        if match is None:
            diag = DiagnosticSpec(
                source_group=technology,
                source_label=name,
                value=value,
                reason=reason,  # type: ignore[arg-type]
                candidates=[c.spec_id for c in candidates[:5]],
            )
            if reason == "AMBIGUOUS":
                ambiguous.append(diag)
            else:
                unmapped.append(diag)
            continue

        spec = get_spec(match.spec_id) or {}
        canonical_flat[match.spec_id] = CanonicalSpecRecord(
            value=value,
            display=value,
            unit=match.unit or spec.get("unit"),
            source_group=technology,
            source_label=name,
            confidence=reason,  # type: ignore[arg-type]
            score=match.score,
            name=match.name,
        )

    legacy = _build_legacy_compat(canonical_flat)

    return NormalizedSpecResult(
        source_grouped=source_grouped,
        canonical_flat=canonical_flat,
        unmapped=unmapped,
        ambiguous=ambiguous,
        legacy_compat_grouped=legacy,
        product_domain=inferred,
    )


def apply_spec_normalization(product: Dict[str, Any]) -> Dict[str, Any]:
    raw = product.get("source_specifications") or product.get("specifications") or []
    if not isinstance(raw, list):
        raw = []
    result = normalize_specifications(raw, product=product)
    product["source_specifications"] = result.source_grouped
    product["canonical_specs"] = {k: v.to_dict() for k, v in result.canonical_flat.items()}
    product["unmapped_specs"] = [u.to_dict() for u in result.unmapped]
    product["ambiguous_specs"] = [a.to_dict() for a in result.ambiguous]
    product["specifications"] = result.legacy_compat_grouped
    if result.product_domain:
        product["product_domain"] = result.product_domain
    return product
