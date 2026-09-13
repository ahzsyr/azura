from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .aliases import normalize_label
from .confidence import (
    SCORE_ALIAS_MATCH,
    SCORE_AMBIGUOUS,
    SCORE_CONTEXT_MATCH,
    SCORE_EXACT,
    should_assign,
)
from .registry import all_specifications, load_registry


@dataclass
class MatchCandidate:
    spec_id: str
    score: int
    name: str
    domain: str
    display_group: str
    unit: Optional[str] = None


def _matches_pattern(value: str, patterns: List[str]) -> bool:
    if not patterns:
        return False
    for pattern in patterns:
        try:
            if re.search(pattern, value, re.IGNORECASE):
                return True
        except re.error:
            continue
    return False


def _source_group_ok(spec: Dict[str, Any], source_group: str) -> bool:
    contexts = spec.get("contexts") or {}
    groups = [normalize_label(g) for g in contexts.get("source_groups") or []]
    if not groups:
        return True
    sg = normalize_label(source_group)
    return any(sg == g or g in sg or sg in g for g in groups)


def _product_domain_ok(spec: Dict[str, Any], product_domain: Optional[str]) -> bool:
    contexts = spec.get("contexts") or {}
    domains = [normalize_label(d) for d in contexts.get("product_domains") or []]
    if not domains or not product_domain:
        return True
    pd = normalize_label(product_domain)
    return pd in domains or any(pd in d or d in pd for d in domains)


def _alias_hit(spec: Dict[str, Any], label: str) -> bool:
    norm = normalize_label(label)
    if normalize_label(spec.get("name") or "") == norm:
        return True
    for alias in spec.get("aliases") or []:
        if normalize_label(alias) == norm:
            return True
    return False


def _score_candidate(
    spec: Dict[str, Any],
    *,
    source_group: str,
    source_label: str,
    value: str,
    product_domain: Optional[str],
) -> int:
    if not _alias_hit(spec, source_label):
        return 0

    label_norm = normalize_label(source_label)
    name_norm = normalize_label(spec.get("name") or "")
    exact_name = label_norm == name_norm

    score = SCORE_ALIAS_MATCH
    group_ok = _source_group_ok(spec, source_group)
    domain_ok = _product_domain_ok(spec, product_domain)
    value_patterns = spec.get("value_patterns") or []
    value_ok = _matches_pattern(value, value_patterns) if value_patterns else False

    if value_patterns and not value_ok and not exact_name:
        return 0

    if group_ok and domain_ok and value_ok:
        return SCORE_EXACT
    if group_ok and domain_ok:
        return SCORE_CONTEXT_MATCH
    if group_ok or domain_ok:
        return max(score, SCORE_ALIAS_MATCH)
    if value_ok and value_patterns:
        return SCORE_CONTEXT_MATCH
    return score if domain_ok else 0


def find_candidates(
    *,
    source_group: str,
    source_label: str,
    value: str,
    product_domain: Optional[str],
) -> List[MatchCandidate]:
    label_norm = normalize_label(source_label)
    if not label_norm:
        return []

    ambiguous_label = label_norm == "power"
    candidates: List[MatchCandidate] = []

    for spec in all_specifications():
        score = _score_candidate(
            spec,
            source_group=source_group,
            source_label=source_label,
            value=value,
            product_domain=product_domain,
        )
        if score <= 0:
            continue
        display = spec.get("display") or {}
        candidates.append(
            MatchCandidate(
                spec_id=str(spec["id"]),
                score=score,
                name=str(spec.get("name") or source_label),
                domain=str(spec.get("domain") or spec["id"].split(".")[0]),
                display_group=str(display.get("group") or spec.get("domain") or "Specifications"),
                unit=spec.get("unit"),
            )
        )

    if ambiguous_label and len(candidates) > 1:
        for c in candidates:
            c.score = min(c.score, SCORE_AMBIGUOUS)
    elif len(candidates) > 1 and candidates[0].score == candidates[1].score:
        if product_domain:
            domain_matches = [c for c in candidates if c.score == candidates[0].score and c.domain == product_domain]
            if len(domain_matches) == 1:
                candidates = domain_matches + [c for c in candidates if c not in domain_matches]

    candidates.sort(key=lambda c: (-c.score, c.spec_id))
    return candidates


def match_specification(
    *,
    source_group: str,
    source_label: str,
    value: str,
    product_domain: Optional[str],
) -> Tuple[Optional[MatchCandidate], List[MatchCandidate], str]:
    candidates = find_candidates(
        source_group=source_group,
        source_label=source_label,
        value=value,
        product_domain=product_domain,
    )
    if not candidates:
        return None, [], "UNMAPPED"

    top = candidates[0]
    tied = [c for c in candidates if c.score == top.score and c.spec_id != top.spec_id]
    assign, reason = should_assign(top.score, 1 + len(tied))
    if not assign:
        return None, candidates, reason
    return top, candidates, reason


def canonical_id_to_csv_column(spec_id: str) -> str:
    return "Meta: spec_" + spec_id.replace(".", "_")
