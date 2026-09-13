# Admin Action System

Global top-bar actions for the AZURA admin dashboard.

## Core rule

**`AdminTopBar` is globally mounted and page-agnostic.** Admin pages own their actions; the top bar only renders and executes the currently registered action contract. No admin page should implement a second, independent save/publish/cancel path solely because the top bar is unavailable — share one handler.

## Architecture

```
AdminShell
 ├── AdminPageConfigProvider   (empty context — pages register config)
 ├── AdminTopBar                (fixed order, no page logic)
 │    └── AdminActionDevIndicator (dev only, grace period)
 ├── AdminKeyboardShortcuts
 └── UnsavedChangesGuard

Admin page
 └── useAdminPageActions / AdminFormProvider / usePatchFormState
        ↓
 registerAdminPageActions(owner)
        ↓
 ownership stack (priority-ordered)
        ↓
 active pageActions → TopBar
```

## Canonical API

```ts
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";

useAdminPageActions({
  ownerKey: "page-editor",   // semantic key for debugging
  scope: "page-editor",
  priority: 0,
  entityId: page?.id,

  onSave: handleSave,
  onCancel: handleCancel,
  onPublish: handlePublish,
  canPublish: Boolean(page?.id),

  saveStatusMode: "automatic", // or "self-managed"
});
```

The hook generates a unique `owner.id` (`page-editor:r42`) from `ownerKey` + React `useId()`.

### Adapters (same underlying registry)

| API | Use when |
|-----|----------|
| `useAdminPageActions` | Preferred for new code |
| `AdminFormProvider` | Entity forms with dirty sync / toast |
| `usePatchFormState` | Diff-based dirty tracking (products) |
| `useAdminFormState` | Thin adapter; prefer `useAdminPageActions` |

### Deprecated

- `registerPageActions` / `clearPageActions` — legacy wrappers that replace the whole stack. CI fails if called outside the store allowlist.

## Ownership stack

Higher priority supersedes lower; **unmount restores** the next owner:

```
SEO Meta (seo-tab, priority 10)  ← active
Page Editor (page-editor, priority 0)
```

When SEO unmounts, Page Editor becomes active again. Do not clear the parent when opening a child tab — keep both registered.

## Runtime vs CI contracts

| Artifact | Role |
|----------|------|
| `adminPageConfig` / `ADMIN_PAGE_CONFIGS` | Runtime — expected actions, mode |
| `admin-action-inventory.ts` | CI — every `/admin/**/page.tsx` must be classified |

`expectedActions` live only in page configs (`required` | `conditional` | `optional`). Inventory references them via `configKey`.

Register runtime config in the page:

```tsx
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";

<AdminPageConfigRegistrar configKey="cmsPageEditor" />
```

## Registered vs enabled

- **Registered** = handler present (`onPublish`)
- **Enabled** = `canPublish !== false`

A disabled Publish button still counts as registered and must not trigger “Missing admin actions”.

## Status ownership

- **`saveStatusMode: "automatic"`** (default) — top bar sets saving → await → saved/error
- **`saveStatusMode: "self-managed"`** — page owns status (multi-step flows)

Legacy `selfManagedSaveStatus: true` still works and maps to self-managed.

## Top bar action order (fixed)

Undo → Redo → Preview → Rebuild → Cancel → Save → Update → Publish

Pages only declare which handlers exist; they cannot reorder buttons.

## Dev enforcement (B)

In development, after a short grace period:

- Console warning with route, mode, expected/registered/enabled actions, owner, stack depth
- TopBar badge: “Missing admin actions” when **required** handlers are absent

## CI enforcement (C)

`src/config/__tests__/admin-action-inventory.test.ts` verifies:

1. Every dashboard `page.tsx` has an inventory entry
2. No duplicate routes
3. Actionable modes with required actions are not `registrationStrategy: "none"`
4. Config mode aligns with inventory mode
5. No legacy `registerPageActions(` outside the allowlist

## Checklist: new admin editor

1. Add inventory entry (or re-run `node scripts/generate-admin-action-inventory.cjs` and adjust classification)
2. Add/reuse a key in `ADMIN_PAGE_CONFIGS` with `expectedActions`
3. Mount `<AdminPageConfigRegistrar configKey="…" />`
4. Register actions via `useAdminPageActions` or `AdminFormProvider`
5. Ensure inline/mobile Save (if any) calls the **same** `handleSave`
6. For nested SEO-style panels, use higher `priority` and keep the parent registered

## Related

- [admin-ia.md](./admin-ia.md) — navigation IA
- [`src/stores/admin-action-registry.ts`](../src/stores/admin-action-registry.ts) — stack helpers
- [`src/hooks/use-admin-page-actions.ts`](../src/hooks/use-admin-page-actions.ts) — canonical hook
