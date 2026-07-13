# Recommended Host Specifications

## Baseline (small production, low traffic)

- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Node.js 20 runtime
- Managed database (Supabase Postgres or managed MySQL)

## Recommended (stable production)

- 4 vCPU
- 8 GB RAM
- 80+ GB SSD
- Reverse proxy with HTTPS (Nginx/host panel)
- CDN for static assets (`/_next/static/*`, `/public/*`)

## High traffic / growth

- 8 vCPU
- 16 GB RAM
- 160+ GB SSD
- Dedicated managed DB tier with connection pooling
- External cache/CDN and active monitoring

## Database recommendations

- PostgreSQL (Supabase): use pooled connection URL on port `6543` with `pgbouncer=true`.
- MySQL: use `utf8mb4` and keep max connections aligned with host memory.

## Operational recommendations

- Keep SSR workload off very small shared hosting when traffic grows.
- Run heavy admin jobs (search reindex/import) during low-traffic periods.
- Backups:
  - Daily DB snapshots
  - Retain at least 7-14 days
- Health checks for app and DB connection should be enabled.
