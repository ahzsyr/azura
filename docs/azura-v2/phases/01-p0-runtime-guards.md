# Phase 1 — P0 Node Runtime-Deactivation Guards (applied)

**Mode:** Implementation.  
**Architecture:** Option A + C; no Edge Prisma SiteFeature.

## Objective

Inactive-but-profile-included Modules must not perform mutation side effects on Marketing ingress (and related short links).

## Work performed (summary)

- Centralized ingress decision helpers (fail-closed for mutation-capable Node ingress; availability may remain fail-open).  
- Guards on Marketing surfaces including short-link `/a`, attribution, events, webhooks, OAuth paths as landed in repo.  
- Distinction preserved: profile omission (middleware) vs runtime inactive (Node).

## Validation

Focused tests + typecheck/lint on touched files (see implementation chat for exact commands/results at time of apply).

## Follow-ups

- Confirm `/a` in profile `disabledPublic*` when marketing omitted **[D]**  
- Re-verify full Phase 2 matrix before calling P0 closed  
- Client attribution bootstrap remains best-effort; server is authority  

**Next:** Phase 2 lifecycle sync (this restart series).
