# Hostinger HTTP cron table (Phase 4)

Set `CRON_SECRET` in the Hostinger environment. Each job:

```bash
curl -X POST "https://YOUR_DOMAIN/api/.../run" \
  -H "Authorization: Bearer $CRON_SECRET"
```

| Interval | Route | Purpose |
|----------|-------|---------|
| every 1 min | `POST /api/cms/scheduled/run` | Publish due CMS pages/posts |
| every 1–5 min | `POST /api/search/index-jobs/run` | Process `SearchIndexJob` queue |
| every 1–5 min | `POST /api/marketing/jobs/run` | Marketing jobs (also accepts admin session) |
| every 5 min | `POST /api/translation/jobs/run` | AI translation jobs (when configured) |
| existing | `POST /api/seo/integrations/run` | SEO submission queue |
| existing | `POST /api/seo/analytics/run` | SEO analytics ingestion |

All runners fail closed without `CRON_SECRET` (marketing allows admin session **or** cron).
