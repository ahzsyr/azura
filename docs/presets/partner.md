# Partner preset (`partner`)

**Status:** Active (Phase 5 Slice 2)

## Classification

| Layer | Value |
|-------|-------|
| Preset ID | `partner` |
| Storage | `portal` (Prisma: `PartnerProgram`, `PartnerCategory`, `Partner`) |
| Admin | `/admin/partners` (Content group) |
| Package | `src/presets/partner/` |

## Templates

| templateId | Status | ViewModel |
|------------|--------|-----------|
| `partner-card` | active | `PartnerCardViewModel` |

Cards link externally via `websiteUrl` / `profileUrl` — no detail page template in Slice 2.

## Block binding

`partnerDirectory` block props:

```ts
{
  presetId: "partner",
  templateId: "partner-card",
  partnerProgramSlug: "alliances",
  categorySlug: "",
  locationFilter: "",
  limit: 0,
}
```

Resolver: `resolvePartnersForBlock` → `entityService` + `PartnerCardTemplate`.

## Entity notes

- `Partner` has no slug — `EntityRef.slug` uses entity `id`.
- `locationFilter` applied post-translation in the partner adapter (same as legacy service).

## Translation

Legacy `entityType` strings: `Partner`, `PartnerCategory`, `PartnerProgram`.  
Preset bridge: `PRESET_ENTITY_ALIASES.partner`.

## Search (capabilities/search)

Partner directory blocks query scoped search via `/api/search?kinds=partner&scope=<programSlug>`. Index hooks run on partner program publish/save in `presets/partner/actions.ts`.
