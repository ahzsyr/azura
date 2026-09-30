from .normalizer import apply_spec_normalization, normalize_specifications
from .registry import domains_dir, load_registry

__all__ = [
    "apply_spec_normalization",
    "normalize_specifications",
    "load_registry",
    "domains_dir",
]
