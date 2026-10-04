# Environment templates

Copy the MySQL template to `.env` in the project root (never commit secrets).

| File | Use when |
|------|----------|
| [`.env.mysql`](./.env.mysql) | MySQL 8.4 (Hostinger / Docker) — **canonical** |

Optional: set `MEDIA_STORAGE=supabase` and related `SUPABASE_*` keys for media files only. Azura does not use PostgreSQL as the application database.

Deployment steps: [`docs/deployment/host-setup-steps.md`](../../docs/deployment/host-setup-steps.md).
