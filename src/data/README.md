# Deprecated runtime catalog data directory

Catalog fixtures have moved to [`seeds/catalog/`](../seeds/catalog/).

Production deployments use PostgreSQL (`Product`, `CatalogCollection`, `SiteSettings`, …) and Supabase Storage. Do not commit runtime data here.

Local filesystem dev mode (`CATALOG_DATA_SOURCE=filesystem`) reads from `seeds/catalog/` via `catalogSeedRoot()`.
