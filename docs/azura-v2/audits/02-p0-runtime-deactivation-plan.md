# Phase 2 — P0 Runtime Deactivation vs Reachable Routes

**Mode:** Analysis and planning (baseline for implementation).  
**Baseline:** [01-existing-system-audit.md](./01-existing-system-audit.md)

## Critical separation

| Concern | API | Enforced in middleware today? |
|---------|-----|-------------------------------|
| Profile omission | `is*Enabled` / `disabled*` prefixes | Yes |
| Runtime deactivation | `isModuleActive` / SiteFeature | **No** |

Do **not** put Prisma SiteFeature checks in Edge/proxy middleware without a proven cache design.

## Guard architecture (proposed)

```text
L0  Compiled profile (middleware) — omitted prefixes → 404
L1  Central Node runtime gate — resolveModuleForPath + active check
L2  Domain services / actions — asserts
L3  UX — layouts, nav, builder effective profile
```

Extra binding required: `/a`, `/a/*` → marketing (outside `/api/marketing`).

## Split ledger policy

- **Availability** (UI, builder): fail **open** on ledger null if profile includes Module.
- **Ingress / mutations**: fail **closed** when active state cannot be established.

## P0 surfaces (remediate first)

| ID | Surface | Gap |
|----|---------|-----|
| M-A | `GET /a` | No guard; cookies/DB |
| M-ATTR | attribution capture | No module guard before persist |
| M-EVT | events | Late assert; pre-assert DB work |
| M-WH-GET | webhook challenge | Succeeds while inactive |
| M-WH-POST | webhook delivery | Soft skip OK; verify early |
| M-OAUTH | OAuth start/callback | Must deny upsert while inactive |

## Recommended inactive responses

| Caller | Prefer |
|--------|--------|
| Beacons (attribution/events) | `200 { skipped }` |
| Webhook GET challenge | Non-success / 404 |
| Webhook POST | `200 { skipped }` |
| Short-link `/a` | Redirect home, **no** cookie |
| OAuth | Deny before token exchange |

## Unresolved product decisions

1. Beacon 200 vs 404  
2. Provider registry cleanup on deactivate  
3. Profile-omit `/a` → middleware 404? (recommended yes)  
4. Fail-closed ingress on ledger null (ops impact)  
5. Other non-prefix Marketing routes?

## Implementation order

1. Red tests for P0 surfaces  
2. Shared Node helper + route bindings (incl. `/a`)  
3. Wire P0 handlers  
4. Profile generator extras for `/a` when marketing omitted  
5. Client bootstrap best-effort  
6. Bootstrap hygiene  
7. Public CMS `/docs` `/status` alignment  
8. Docs for split policy  

**Acceptance:** No Marketing mutation or attribution cookie while Marketing SiteFeature is disabled and profile still includes Marketing.
