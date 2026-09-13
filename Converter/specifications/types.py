from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

ConfidenceLabel = Literal["EXACT", "CONTEXT_MATCH", "ALIAS_MATCH", "AMBIGUOUS", "UNMAPPED"]


@dataclass
class CanonicalSpecRecord:
    value: str
    display: str
    unit: Optional[str] = None
    source_group: str = ""
    source_label: str = ""
    confidence: ConfidenceLabel = "UNMAPPED"
    score: int = 0
    name: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "display": self.display,
            "unit": self.unit,
            "source_group": self.source_group,
            "source_label": self.source_label,
            "confidence": self.confidence,
            "score": self.score,
            "name": self.name,
        }


@dataclass
class DiagnosticSpec:
    source_group: str
    source_label: str
    value: str
    reason: ConfidenceLabel
    candidates: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "source_group": self.source_group,
            "source_label": self.source_label,
            "value": self.value,
            "reason": self.reason,
        }
        if self.candidates:
            out["candidates"] = self.candidates
        return out


@dataclass
class NormalizedSpecResult:
    source_grouped: List[Dict[str, Any]]
    canonical_flat: Dict[str, CanonicalSpecRecord]
    unmapped: List[DiagnosticSpec]
    ambiguous: List[DiagnosticSpec]
    legacy_compat_grouped: List[Dict[str, Any]]
    product_domain: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_specifications": self.source_grouped,
            "canonical_specs": {k: v.to_dict() for k, v in self.canonical_flat.items()},
            "unmapped_specs": [u.to_dict() for u in self.unmapped],
            "ambiguous_specs": [a.to_dict() for a in self.ambiguous],
            "specifications": self.legacy_compat_grouped,
            "product_domain": self.product_domain,
        }
