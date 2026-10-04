# Deployment documentation

Hostinger is the sole supported production runtime (Node 24 + npm + MySQL 8.4).
SQL schemas and import bundles live under [`database/`](../database/README.md).

| Document | Purpose |
|----------|---------|
| [host-setup-steps.md](./host-setup-steps.md) | Step-by-step first deploy |
| [deployment-requirements.md](./deployment-requirements.md) | Software, env vars, build/run |
| [recommended-host-specs.md](./recommended-host-specs.md) | Sizing and ops guidance |
| [technology-policy.md](./technology-policy.md) | Phase 5 technology SSOT / anti-drift status table |
| [next-usage-audit.md](./next-usage-audit.md) | Phase 5 Next.js usage audit; Cache Components deferred |
| [hostinger-stability-gate.md](./hostinger-stability-gate.md) | Phase 4 Stability Gate checklist |
| [hostinger-cron.md](./hostinger-cron.md) | HTTP cron table (SEO, search, CMS, marketing, translation) |
| [storage-and-webhooks.md](./storage-and-webhooks.md) | StorageProvider, MediaAsset identity, outbound webhooks |
| [local-dev-runtime.md](./local-dev-runtime.md) | Local Node/Bun + Docker MySQL |
| [search-architecture.md](./search-architecture.md) | Search policy: MySQL FULLTEXT vs Fuse.js |
| [blocknote-pilot.md](./blocknote-pilot.md) | Phase 1.5 BlockNote field RTE pilot (TipTap remains default) |
| [page-ast.md](./page-ast.md) | Page AST envelope contract (Phase 2) |
| [locale-fallback.md](./locale-fallback.md) | Locale fallback + admin/public contract (Phase 3) |
| [motion-audit.md](./motion-audit.md) | Motion / reduced-motion notes |

Environment templates: [`database/env/`](../database/env/README.md).

Deploy scripts: [`scripts/deploy/README.md`](../../scripts/deploy/README.md).

Product overview: [`product-vision.md`](../product-vision.md).
