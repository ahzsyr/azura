# Local vs production runtime

| Environment | Engine | Install | Lockfile |
|-------------|--------|---------|----------|
| **Hostinger / Docker** | Node.js 24 | `npm ci` then `npm run build` / `npm start` | **`package-lock.json`** (authoritative) |
| **Local Mac** | Bun | `bun install`, `bun run dev`, `bun test` | Keep `package-lock.json` in sync — do not casually alternate installers |

## Rules

- Do **not** add `bunfig.toml` unless Bun-specific flags become required.
- Production never runs on Bun — Dockerfile uses `node:24-bookworm` and `npm ci`.
- Prefer updating dependencies with a single installer path that regenerates `package-lock.json` for Hostinger (`npm install` / `npm ci` verification).

## Database GUI (local Docker)

MySQL is published on **`localhost:3307`**.

```bash
# Prisma Studio
bun run db:studio
# or
npm run db:studio
```

External GUIs (TablePlus, Beekeeper Studio):

- Host: `127.0.0.1`
- Port: `3307`
- User / password / database: see `.env` or `docker-compose.yml` (`azura` / `azura_db`)
