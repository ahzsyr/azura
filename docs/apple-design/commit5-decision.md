# Commit 5 Step 1 — approval decision

Step 0 report accepted. The `getContentFieldSuffix` trace is decisive and correct: changing the
locale `code` to `en-US` yields `EnUs` and orphans every `*En` content column. `code` stays `en`;
only `htmlLang` moves to `en-US`. Zero test references to the payload files confirms Option A is
low-risk on the test side.

## Approval

| Decision | Approved |
| --- | --- |
| `htmlLang: "en-US"` in `FALLBACK_LOCALES`, `DEFAULT_ADMIN_LOCALE`, `LOCALE_SEEDS` (both seeds) | ✅ |
| `code` stays `en`; `urlPrefix` stays `en` | ✅ |
| Payloads: Option A — delete `messages/ar.json`, `messages/id.json` | ✅ **conditional** on the live-locale check below |
| Formatting stays `en-US` / `USD` | ✅ already correct |

### Condition on deleting the payloads

Approved **only if** the live-locale check is answered affirmatively. The check cannot be run
from this tree; it is one query against each deployed environment (production, staging):

```sql
SELECT code, isEnabled, isDefault FROM "LocaleConfig" ORDER BY sortOrder;
```

- Any row with `isEnabled = true` other than `en` → **do not delete.** Those visitors would fall
  back to English silently via `loadFileMessages`, which is a user-visible regression, not a
  cleanup. Report the row and stop.
- Only `en` enabled (or the table absent on a fresh env) → delete both files.

If the check cannot be run at all: **still delete**, because the seed intent is English-only and
`prisma/seed.ts:166` / `ensure-baseline-cms.ts:184` already delete the `ar` locale row on every
seed/setup run — i.e. the codebase has already been removing Arabic config on each deploy. Deleting
the payload is consistent with that. Record the residual risk in the commit message: "if any
deployed env enables ar/id, re-add via locale scaffold."

---

## A separate problem found in Step 0 — the seed deletes Arabic but leaves Indonesian

`prisma/seed.ts:166` and `src/features/setup/ensure-baseline-cms.ts:184` both run

```ts
await prisma.localeConfig.deleteMany({ where: { code: "ar" } });
```

and then upsert only `en`. That means:

1. **`ar` is actively stripped on every seed/setup** — already consistent with "English base".
2. **`id` is never handled.** No seed row, no delete. If a deployed database contains an `id`
   `LocaleConfig` row (enabled by an admin through the languages UI), the cleanup does not remove
   it, while this commit deletes `messages/id.json` — the locale row points at a file that no
   longer exists and silently serves English. That is the exact failure mode the payload deletion
   is meant to avoid, and it exists today.

Fix in this commit:

- Replace both hard-coded `deleteMany({ code: "ar" })` calls with a policy that matches the
  instruction: delete every non-default locale row, or explicitly
  `deleteMany({ where: { code: { not: "en" }, isDefault: false } })`. Keep whatever migration path
  the project already uses for removed locales; do not invent one.
- If deleting non-`en` rows is too aggressive for a store that may have locales enabled
  deliberately, then the alternative is: **do not delete payloads** and instead keep them as
  optional overlays (Option B). The two decisions must agree — a seed that strips locales and a
  repo that keeps payloads is coherent; a seed that keeps an `id` row and a repo that deletes its
  payload is not.

Recommended: generic non-default delete in both files + Option A payload deletion, and a commit
message that says so in one line.

---

## Commit 5 prompt (execute)

> Gate 4, **Commit 5**, base `4721a35a`. Standing rules; touch only what is listed.
>
> 1. **Locale language.** In `src/i18n/locale-config.ts` set `htmlLang: "en-US"` for
>    `DEFAULT_ADMIN_LOCALE` and every entry of `FALLBACK_LOCALES`; keep `code: "en"` and
>    `urlPrefix: "en"`. Mirror in `prisma/seed.ts` `localeSeeds` and
>    `src/features/setup/ensure-baseline-cms.ts` `LOCALE_SEEDS`. Do **not** touch
>    `CONTENT_SUFFIX_BY_CODE` or `getContentFieldSuffix`.
> 2. **Seed policy.** In `prisma/seed.ts:166` and `ensure-baseline-cms.ts:184` replace the
>    hard-coded `deleteMany({ where: { code: "ar" } })` with a delete of every non-default locale
>    row (never the `en` row, never `isDefault: true`). Comment one line: "English is the base
>    locale; other locales are added per deployment."
> 3. **Payloads.** Run `git rm messages/ar.json messages/id.json`. Grep for any import of those
>    paths and any test asserting on their contents; fix only what breaks, list every file.
> 4. **Docs.** Update `docs/apple-design/final-report.md` §5 (i18n debt now excludes deleted
>    payloads; the storefront string debt outside `messages/` is unchanged) and §7 if any line
>    referenced a locale. Append backlog: "Add a locale = admin `scaffoldMessageFile` →
>    `messages/{code}.json`, translate, enable `LocaleConfig` row; no code change required.
>    Arabic payload was removed at `4721a35a`; recover from git history if a deployment needs it."
> 5. Verify: `grep -rn "messages/ar\|messages/id" src scripts prisma` returns nothing;
>    `npm run typecheck` (or the Docker Node 24 equivalent) has no new errors attributable to this
>    commit.
> 6. Commit as `i18n: English (en-US) base locale; translated payloads optional`. Print the diff
>    stat and the two grep results. Stop.
>
> If the live-locale check shows a non-`en` enabled row: **stop at step 3 before `git rm`**, report
> the row, and do not delete.

### Acceptance checklist

- [ ] `code` / `urlPrefix` still `en` everywhere; only `htmlLang` changed.
- [ ] `getContentFieldSuffix` untouched; no `EnUs` appears anywhere.
- [ ] Both seeds delete non-default locales generically; neither can delete the `en` row.
- [ ] `messages/` contains only `en.json`.
- [ ] No remaining reference to the deleted payload paths in source, scripts, or prisma.
- [ ] Commit message records the re-add path and the git-history recovery line.
