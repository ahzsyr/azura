# Commit 5 acceptance + two follow-ups

## `72e663eb` — ACCEPTED

| Item | Verified |
| --- | --- |
| `htmlLang: "en-US"` in `FALLBACK_LOCALES`, `DEFAULT_ADMIN_LOCALE`, `prisma/seed.ts:154`, `ensure-baseline-cms.ts:63` | ✅ |
| `code` / `urlPrefix` still `en`; `CONTENT_SUFFIX_BY_CODE` untouched | ✅ |
| Both seeds now `deleteMany({ code: { not: "en" }, isDefault: false })` with the policy comment | ✅ — cannot delete the `en` row, does strip a stray `id` row, which was the incoherence I flagged |
| `messages/` contains only `en.json`; −902 lines | ✅ |
| No references to deleted payload paths in `src` / `scripts` / `prisma` | ✅ (grep empty) |
| Docs updated; backlog records re-add path + git-history recovery | ✅ |

The live-locale query was correctly reported as unavailable rather than guessed, and the decision
proceeded on the documented fallback. Residual risk is exactly what the backlog line now says.

---

## Finding: a locale row left enabled in a deployed DB now serves an untranslated page in a foreign `lang`

`src/i18n/request.ts:34–49` has no `enabled = false` guard when a non-default locale is requested.
If a deployed `LocaleConfig` row for `ar` or `id` still has `isEnabled: true` and `isDefault: false`
(the seed's new delete covers that case at the *next* seed run, not now), then:

- `loadFileMessages` falls back to `en` → the page renders English,
- `messages` has no `NextIntlClientProvider` bundle for that code,
- `<html lang>` becomes `resolvePrefixToCode` → `"ar"` / `"id"`, **not** `en-US`.

Result: an English page announced to assistive tech and search engines as Arabic or Indonesian.
That is a worse failure than "serves English" — it is a wrong-language claim.

**Cheap hardening (2 lines), recommended in a small follow-up commit:**

```ts
// request.ts — after resolving urlPrefix
if (urlPrefix !== defaultPrefix && !(await messageFileExists(code))) {
  urlPrefix = defaultPrefix;
  code = "en";
}
```

or, simpler and policy-aligned: `filterActivePublicLocales` additionally drops any locale whose
`messageFileExists(code)` is false. Either one makes "English base, locales added later" true even
on a stale database. It belongs in this locale policy, not a future gate.

---

## Finding: hard-coded `htmlLang` in the admin locale UI

`src/features/i18n/components/languages-admin.tsx:132` renders

```tsx
<Input name="htmlLang" placeholder="fr" defaultValue={locale?.htmlLang ?? ""} />
```

with no server-side default. When an admin adds a locale later — the exact flow this commit
makes canonical — the `htmlLang` field starts empty and a blank value persists into the
`LocaleConfig` row, which then feeds `<html lang>` and hreflang/og:locale. Since `en-US` is now the
project's base-language convention, the field should default (placeholder and initial value) to a
BCP-47 hint such as `en-US` / `fr-FR` and show the expected format, e.g. `de-DE`.

---

## Cannot verify from this tree (state it in the report)

- The `.env` `DATABASE_URL` points at a Docker-compose host (`mysql://…@mysql:3306/azura_db`); no
  local MySQL on 3306 and no `node`/`npx`/Docker CLI on this machine, so the live-locale query was
  not run and the baseline seed (`ensureBaselineCmsAndLocales`, called from
  `src/app/api/setup/complete/route.ts`) was not executed.
- Therefore: **which environments have non-default locales enabled remains unknown**, and the
  stale-row risk above remains open until someone runs
  `SELECT code, isEnabled, isDefault FROM LocaleConfig ORDER BY sortOrder;` against each environment.

---

## Follow-up prompt (Commit 6)

> Gate 4, **Commit 6 — locale hardening.** Base `72e663eb`. Small, two items.
>
> 1. **Untranslated non-default locale cannot leak into the shell.**
>    In `src/i18n/request.ts`, if the requested `urlPrefix` is not the default and
>    `messageFileExists(code)` is false, resolve to the default prefix/code before loading
>    messages (keep existing behaviour for the default locale unchanged). Or, if you prefer the
>    filter route: make `filterActivePublicLocales` drop any locale without a message file, and say
>    which consumers pick it up. Print the diff for the choice you make.
> 2. **Admin htmlLang default.** `languages-admin.tsx:132`: default the field to the locale's
>    existing value, and when creating a new locale show format help (`en-US`, `fr-FR`, `de-DE`)
>    via placeholder + helper text. No validation change unless one already exists.
> 3. **Report.** Add to `final-report.md` §5: "Locales are add-on: base `en` (`htmlLang: en-US`);
>    a locale without a message file is not routable as an untranslated shell." Append backlog:
>    live-locale check still unrun against each environment.
>
> Commit as `i18n: English base locale hardening`. Print the diff and any typecheck errors
> attributable to the change. Stop.

### Acceptance checklist

- [ ] Requesting a non-default prefix with no message file yields default locale + `en-US` htmlLang.
- [ ] Default-locale path unchanged (no new async work on the hot path if avoidable — say if not).
- [ ] Admin htmlLang field shows the current value and a format hint for new locales.
- [ ] Final report and backlog updated; live check still marked unrun.
