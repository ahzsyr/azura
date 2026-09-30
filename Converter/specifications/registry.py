from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

_DOMAINS_DIR = Path(__file__).resolve().parent / "domains"
_CACHE: Optional[Dict[str, Any]] = None


def _load_domain_file(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_registry(force_reload: bool = False) -> Dict[str, Any]:
    global _CACHE
    if _CACHE is not None and not force_reload:
        return _CACHE

    domains: Dict[str, Dict[str, Any]] = {}
    specifications: Dict[str, Dict[str, Any]] = {}
    domain_order: List[str] = []

    for path in sorted(_DOMAINS_DIR.glob("*.json")):
        data = _load_domain_file(path)
        domain_key = str(data.get("domain") or path.stem)
        domains[domain_key] = data
        domain_order.append(domain_key)
        for spec in data.get("specifications") or []:
            spec_id = str(spec.get("id") or "")
            if spec_id:
                specifications[spec_id] = spec

    domain_order.sort(key=lambda d: int((domains[d].get("display") or {}).get("order", 999)))

    _CACHE = {
        "domains": domains,
        "specifications": specifications,
        "domain_order": domain_order,
    }
    return _CACHE


def get_spec(spec_id: str) -> Optional[Dict[str, Any]]:
    return load_registry()["specifications"].get(spec_id)


def all_specifications() -> List[Dict[str, Any]]:
    return list(load_registry()["specifications"].values())


def domains_dir() -> Path:
    return _DOMAINS_DIR
