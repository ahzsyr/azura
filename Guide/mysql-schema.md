# MySQL Schema

Canonical schema source:

- `database/mysql/01-schema.sql`

This schema is generated from Prisma (`prisma/schema.prisma`) and contains all `CREATE TABLE`, indexes, enums, and foreign keys needed for MySQL 8+.

## Use it directly

- In phpMyAdmin: import `database/mysql/01-schema.sql`.
- In MySQL CLI: run the query script in `Guide/mysql-create-tables.sql`.

## Optional seed files

After schema creation, you can import one seed:

- `database/mysql/02-seed-blank.sql` (clean initial state)
- `database/mysql/02-seed-demo-brt.sql` (demo data)
- `database/mysql/02-seed-demo-safar.sql` (demo data)
