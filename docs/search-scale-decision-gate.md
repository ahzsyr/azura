# Search Scale Decision Gate

## Decision

Do not adopt an external search engine by default. The current execution target is:

- PostgreSQL full-text search with weighted vectors for global/site search.
- Catalog inverted facet read models for listing filters.
- Materialized autocomplete response cache for high-frequency prefix queries.
- Semantic-versioned index and cache keys for safe compatibility changes.

Typesense, Meilisearch, or another external engine should only be introduced after measured evidence shows the current stack cannot meet scale, latency, relevance, or operational goals.

## Evaluation Criteria

- Product count and `SearchDocument` count growth.
- p50/p95/p99 search and catalog listing latency.
- zero-result rate and recall-drift trends.
- autocomplete latency and cache hit rate.
- operational complexity of rebuilds, syncs, and rollback.
- ranking quality scorecards from observed user behavior.

## External Engine Trigger Conditions

Evaluate external search when one or more conditions persist after tuning:

- p95 global search latency exceeds the agreed SLO under normal load.
- p95 catalog listing latency regresses after inverted-facet rollout.
- autocomplete cannot meet target latency with materialization.
- PostgreSQL FTS ranking quality cannot meet agreed relevance targets.
- SearchDocument volume or write throughput creates unacceptable database pressure.

## Required Follow-up Before Adoption

- Migration plan with dual-write and shadow-read period.
- Parity and recall-drift gates equivalent to catalog engine cutover.
- Rollback path that does not require emergency reindexing.
- Cost and operational ownership review.
