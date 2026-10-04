# Storage & webhooks (Phase 4)

**Hostinger is the sole production deployment target.** Local development and Hostinger both support `MEDIA_STORAGE=local`.

## Storage

Core CMS data: **MySQL 8.4** via Prisma.

Media files go exclusively through `StorageProvider` (`src/lib/storage-provider.ts`):

| `MEDIA_STORAGE` | Backend | Identity |
|-----------------|---------|----------|
| `local` (default) | Disk under uploads | `storageBackend=local`, `bucket=local`, `objectKey` |
| `supabase` | Supabase Storage | `storageBackend=supabase`, `bucket`, `objectKey` |
| `s3` | S3-compatible (AWS / R2) | `storageBackend=s3`, `bucket`, `objectKey` |

### Canonical identity

`MediaAsset.storageBackend` + `bucket` + `objectKey` is the **canonical** storage identity.  
`MediaAsset.url` is a **denormalized cache** for public reads and must never be required to locate or delete an object.

S3 env: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT`, `S3_REGION`, `S3_PUBLIC_BASE_URL`.

## Webhooks

`src/lib/webhooks/dispatch.ts` — best-effort signed POST to `WEBHOOK_ENDPOINTS` (comma-separated).

- HMAC: `WEBHOOK_SIGNING_SECRET` → header `x-azura-signature` (required in production when endpoints are set)
- SSRF: DNS-resolved IP checks; `redirect: 'error'`
- Domain writes never depend on webhook success (no outbox in Phase 4)

Events: `cms.page.published`, `cms.page.unpublished`, `cms.post.published`, `cms.post.unpublished`, `media.uploaded`, `form.submitted`.

## Cron (Hostinger HTTP)

Set `CRON_SECRET` and `POST` with `Authorization: Bearer $CRON_SECRET` to `/api/*/run` runners. See Phase 4 Stability Gate / Hostinger cron table.
