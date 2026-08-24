# Environment templates

Copy the template that matches your database provider to `.env` in the project root (never commit secrets).

| File | Use when |
|------|----------|
| [`.env.mysql`](./.env.mysql) | MySQL 8+ or compatible MariaDB |
| [`.env.postgres`](./.env.postgres) | PostgreSQL / Supabase |

Deployment steps: [`docs/deployment/host-setup-steps.md`](../../docs/deployment/host-setup-steps.md).
