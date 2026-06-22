# PostgreSQL Schema (Supabase default)

Canonical schema source:

- `database/postgres/01-schema.sql`

This schema is generated from Prisma (`prisma/schema.postgresql.prisma`) and contains all required enums, tables, indexes, and foreign keys for PostgreSQL 15+ / Supabase.

## Use it directly

- In Supabase SQL Editor: import or paste `database/postgres/01-schema.sql`.
- In psql: run the query script in `Guide/postgres-create-tables.sql`.

## Optional seed files

After schema creation, import one seed:

- `database/postgres/02-seed-blank.sql` (clean initial state)
- `database/postgres/02-seed-demo-brt.sql` (demo data)
- `database/postgres/02-seed-demo-safar.sql` (demo data)

## One-file alternative

For first deploys, you can import:

- `database/postgres/import-blank.sql`

This bundled file is often the fastest route for host setup.
