from __future__ import annotations

from typing import Literal, Tuple

ConfidenceLabel = Literal["EXACT", "CONTEXT_MATCH", "ALIAS_MATCH", "AMBIGUOUS", "UNMAPPED"]

SCORE_EXACT = 100
SCORE_CONTEXT_MATCH = 90
SCORE_ALIAS_MATCH = 75
SCORE_AMBIGUOUS = 40
SCORE_UNMAPPED = 0

ASSIGN_THRESHOLD = 70


def score_to_label(score: int) -> ConfidenceLabel:
    if score >= SCORE_EXACT:
        return "EXACT"
    if score >= SCORE_CONTEXT_MATCH:
        return "CONTEXT_MATCH"
    if score >= SCORE_ALIAS_MATCH:
        return "ALIAS_MATCH"
    if score >= SCORE_AMBIGUOUS:
        return "AMBIGUOUS"
    return "UNMAPPED"


def should_assign(score: int, candidate_count: int) -> Tuple[bool, ConfidenceLabel]:
    if candidate_count == 0:
        return False, "UNMAPPED"
    if candidate_count > 1 and score < SCORE_EXACT:
        return False, "AMBIGUOUS"
    if score >= ASSIGN_THRESHOLD:
        return True, score_to_label(score)
    if candidate_count > 1:
        return False, "AMBIGUOUS"
    return False, "UNMAPPED"
