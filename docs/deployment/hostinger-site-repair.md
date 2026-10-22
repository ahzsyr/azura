# Hostinger site repair (Welcome / admin broken)

Use when a Hostinger site shows `/welcome`, `/admin` fails, or `/api/setup/status` returns `databaseReady: false`.

## Confirmed example

`https://mediumblue-sardine-581159.hostingersite.com/api/setup/status`:

```json
{"setupComplete":true,"databaseReady":false,"databaseKind":"mysql"}
```

Node is running; this site’s MySQL connection or schema is not ready. Redeploy did not “delete” the app.

## Repair checklist (hPanel + SSH)

Do this **per website**. Each site needs its own MySQL DB and uploads folder.

1. **Databases** — Create a MySQL database + user for this site only (do not reuse another site’s DB).
2. **Node.js → Environment variables** (this website only):

```env
NEXT_PUBLIC_SITE_URL=https://mediumblue-sardine-581159.hostingersite.com
DATABASE_URL=mysql://SITE_USER:PASSWORD@localhost:3306/SITE_DB
HOSTINGER_MYSQL_LOCALHOST=1
INTERNAL_APP_URL=http://127.0.0.1:3000
SETUP_COMPLETE=true
MEDIA_STORAGE=local
LOCAL_PUBLIC_DIR=/home/<user>/persistent/mediumblue-sardine/public
AUTH_SECRET=<unique long random string>
```

URL-encode special characters in the MySQL password. Prefer `localhost` in `DATABASE_URL` (or keep `srv*.hstgr.io` and rely on `HOSTINGER_MYSQL_LOCALHOST=1`).

3. **Persistent uploads** (SSH once):

```bash
mkdir -p /home/<user>/persistent/mediumblue-sardine/public/uploads
```

4. **Start command:** `node scripts/deploy/hostinger-start.mjs`  
   Then restart the Node app in hPanel.

5. **If the DB is empty** (no tables): over SSH run `npm run deploy:hostinger-db` **or** import blank SQL once, then open `/setup`.  
   **Never** import blank SQL / run `SETUP_FRESH_INSTALL=1` / `db:zero-data` on a DB that already has content.

6. **Verify:**

```bash
npm run test:db
npm run diagnose:hostinger
curl -sS https://mediumblue-sardine-581159.hostingersite.com/api/setup/status
```

Expect `databaseReady: true`. Then open `/account/login` and `/admin` (not stuck on `/welcome`).

## Data safety

- Redeploy must not wipe MySQL (Hostinger managed DB is outside the app folder).
- Uploads survive only when `LOCAL_PUBLIC_DIR` is outside the deploy tree and only `public/uploads` is symlinked.
- See [host-setup-steps.md](./host-setup-steps.md) §8 and [scripts/deploy/README.md](../../scripts/deploy/README.md).
