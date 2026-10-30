# Data model — Modules platform tables

Schema: `prisma/schema/mysql/platform.prisma` (and sibling schema packs for Module-owned entities).

## 1. SiteFeature

```prisma
model SiteFeature {
  kind      String   // "module" | "preset"
  featureId String
  enabled   Boolean  @default(true)
  updatedAt DateTime @updatedAt

  @@id([kind, featureId])
}
```

| Concern | Rule |
|---------|------|
| Scope | Only profile-included modules/presets are seeded |
| Default | Missing included rows created as `enabled: true` |
| Capabilities | Not stored here |
| Deactivate | Sets `enabled: false` — does not delete the row |

## 2. PackageInstallation

```prisma
model PackageInstallation {
  packageId   String   @id
  kind        String   // app | extension | theme
  version     String
  status      String   // installed | active | inactive | pending
  manifest    Json     // PackageManifest or installation envelope
  installedAt DateTime
  updatedAt   DateTime

  migrations PackageMigration[]
}
```

| Concern | Rule |
|---------|------|
| Builtin Modules | Seeded/updated from ModuleManifest projection |
| Pending | Unknown / not-yet-deployed ids from ZIP |
| Envelope | Theme/extension may wrap package + artifacts in JSON |
| Soft uninstall builtin | Keeps row after deactivate |
| Remove pending | Deletes row |

## 3. PackageMigration

```prisma
model PackageMigration {
  id         String
  packageId  String
  version    String
  filename   String
  checksum   String
  direction  String   // up | down
  appliedAt  DateTime
  package    PackageInstallation @relation(... onDelete: Cascade)

  @@unique([packageId, filename, direction])
}
```

| Concern | Rule |
|---------|------|
| Purpose | Ledger of allowlisted **ship-time filesystem** package SQL applications |
| Up idempotency | Skip when filename + checksum match; **refuse** checksum mismatch on same filename |
| Down | Eligible only when the matching **up** ledger row exists; successful down **deletes that up row** |
| Core schema | Remains in `prisma/migrations` — not replaced by package SQL |
| ZIP SQL | Import may store SQL in a pending ZIP for honesty, but **does not apply** it for unknown apps |
| Cascade | Deleting PackageInstallation removes migration rows |
| Rollback | Not universal — see [phase-2-state-transitions.md](./plans/phase-2-state-transitions.md) |

## 4. ModuleSetting (Phase 3)

```prisma
model ModuleSetting {
  id            String
  packageId     String
  key           String   // typically "__root" blob
  value         Json
  schemaVersion Int
  updatedAt     DateTime
  updatedBy     String?
  @@unique([packageId, key])
}
```

| Concern | Rule |
|---------|------|
| Ownership | Core registry + this table; schemas in `src/modules/<id>/settings.ts` |
| Secrets | Marked in registry; export redacts; audit never stores secret payloads |
| Deactivate | **Retains** rows |
| Reset | Explicit operator action — restores defaults / clears secrets |
| ZIP | Cannot register settings schemas |

See [phase-3-settings-and-permissions.md](./plans/phase-3-settings-and-permissions.md).

## 5. Module-owned domain data

Each Module may own additional Prisma models (Documentation portals, Status boards, Marketing visitors/campaigns, SEO advanced tables, etc.). Those tables are **Core schema** in the monorepo sense even when logically owned by a Module. `User.modulePermissionGrants` lives on the Core User model (Phase 3 ACL).

Retention policy for Modules Manager:

- **Deactivate / soft uninstall:** domain rows stay.
- **Destructive remove:** only for non-builtin packages where down SQL is permitted; builtins cannot be removed this way.
- **Profile omit:** does not automatically DELETE domain rows.
- **Purge:** product unavailable (Phase 5+; Phase 8 matrix).

Per-operation and per-shipped-Module retention/export matrix (settings export vs Package ZIP vs CMS dump): [plans/phase-8-operational-maturity-release-policy.md](./plans/phase-8-operational-maturity-release-policy.md) § Retention / export.

## 6. Related Core stores touched by packages

| Store | Touched by |
|-------|------------|
| `SiteTheme` (published) | Theme package activate |
| Media / Documents | Theme asset materialize |
| Builder page JSON | Unaffected on deactivate (blocks become unavailable) |
