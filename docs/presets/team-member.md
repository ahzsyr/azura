# Team member preset (`team-member`)

**Status:** Active (Phase 5 Slice 2)

## Classification

| Layer | Value |
|-------|-------|
| Preset ID | `team-member` |
| Storage | `portal` (Prisma: `TeamDirectory`, `TeamDepartment`, `TeamMember`) |
| Admin | `/admin/team` (Content group) |
| Package | `src/presets/team-member/` |

## Templates

| templateId | Status | ViewModel |
|------------|--------|-----------|
| `member-card` | active | `TeamMemberCardViewModel` |

No detail template — `routePolicy: "none"`.

## Block binding

`teamDirectory` block props:

```ts
{
  presetId: "team-member",
  templateId: "member-card",
  teamDirectorySlug: "company",
  departmentId: "",
  limit: 0,
}
```

Resolver: `resolveTeamMembersForBlock` → `entityService` + `MemberCardTemplate`.

## Entity notes

- `TeamMember` has no slug — `EntityRef.slug` uses entity `id`.
- Department filter uses `departmentId` (departments have no slug).

## Translation

Legacy `entityType` strings: `TeamMember`, `TeamDepartment`, `TeamDirectory`.  
Preset bridge: `PRESET_ENTITY_ALIASES["team-member"]`.

## Search (capabilities/search)

Team directory blocks query scoped search via `/api/search?kinds=team_member&scope=<directorySlug>`. Index hooks run on team directory publish/save in `presets/team-member/actions.ts`.
