from __future__ import annotations

import re
import unicodedata


def normalize_label(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def slugify(text: str) -> str:
    text = normalize_label(text)
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")
