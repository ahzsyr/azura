# Gate 4 Commits 2–4 acceptance + locale policy (en-US base)

## Commits 2–4 — ACCEPTED

| Commit | Scope verified | Note |
| --- | --- | --- |
| `fb388df8` dark sweep | docs only (table + backlog line) | No token value changes — the right outcome if everything passes. Non-computable surfaces (85%/55% card mixes, dark_premium overlay, translucent chrome, badges on imagery) are correctly marked rather than estimated. |
| `acb30a95` forced-colors | `site-glass-effect.css` only, 58 lines | Sale, low-stock, stock badge, savings, wishlist saved, PDP stock states covered with opaque `Canvas`/`Highlight` and borders. |
| `4721a35a` final report | `docs/apple-design/final-report.md` | Seven sections; §7 marks all eleven items **Unverified**; §5 names the ~19 outside-`messages/` strings as i18n debt; §6 keeps security out. |

`acb30a95` landed on top of `44f27a5c` as stated. Gate 4 is closed. Phase B is **code-complete**.

---

## The locale instruction changes the work: `id` and `ar` become optional payloads

Stated policy: **English (`en` / `en-US`) is the base locale.** Arabic, Indonesian and any other
language are add-ons that must not ship in the base code.

### What the base code actually does today

| Fact | Source | Implication |
| --- | --- | --- |
| Routing default is English; fallback is `en` only | `src/i18n/locale-config.ts` `FALLBACK_LOCALES`, `src/i18n/routing.ts` | ✅ already correct |
| URLs are `/{locale}/…` with `en` prefixed | `STATIC_DEFAULT_URL_PREFIX = "en"` | Fine, but `/en` is a locale segment, not a full `en-US` code |
| `html lang` is `en`, not `en-US` | `locale-config.ts:30,45` | ⚠️ base locale is generic English, not en-US |
| Formatting already defaults to `en-US` | `src/i18n/format.ts:13–14` (currency `en-US`, number/date `en-US`) | Partially en-US |
| `ar` and `id` are **exactly in sync with `en`** | 371 keys each, 0 missing, 0 extra | Already maintained — they are not stray files |
| `ar`: 8 keys English; `id`: **171 of 371 keys English-held (~46%)** | computed from `messages/*.json` | `id` is half-translated; `ar` is nearly complete |
| `loadFileMessages` falls back `{code}.json` → default | `src/i18n/request.ts:10–20` | A missing file degrades safely, **but** `extractMessages`/`scaffoldMessageFile` can auto-create from `en` |
| Admin can create/inspect locale message files | `src/i18n/message-files.ts` (`scaffoldMessageFile`) | Locale add is a runtime capability, which is the architecture the instruction asks for |
| Many content columns are `*Ar` specific | `posts`, `studio`, `resolveTranslation("title","ar")` | Content-layer Arabic is separate from UI copy; not removable by deleting `messages/ar.json` |

So the honest reading of "no need to include it in the base code": the **architecture** already
supports add-on locales — what is in the base tree is the **preloaded payload**.

### Decision needed — two options, both valid, different consequences

**Option A — remove translated payloads from the base repo (recommended).**
- Delete `messages/ar.json`, `messages/id.json`; adjust any test that asserts on them (grep first).
- The 171 `id` English-held keys and 8 `ar` ones disappear as debt.
- Seed a locale via the existing admin path (`scaffoldMessageFile`) or a marketplace/VS Code
  translation workflow — this keeps "add later" as a supported flow rather than a code change.
- Risk: if any *deployment* currently has `ar`/`id` enabled in DB, deleting the files silently
  degrades those visitors to English. **Check the enabled-locale rows before deleting.** Do not
  delete if production has them live.

**Option B — keep them, mark as optional overlays.**
- Move to `messages/optional/{ar,id}.json` and have `loadFileMessages` try
  `messages/{code}.json` then `messages/optional/{code}.json`.
- Adds an indirection for a policy that may not need one; keeps the half-translated `id` in the repo.
- Recommended only if production actually serves those locales today.

### en-US specifically

"Main locale is English en-US" is not fully implemented:

1. `html lang` is `en`. For a US-English base, set `htmlLang: "en-US"` for the default locale
   (and keep the URL prefix `en`). Meta/SEO and screen readers read `html lang`.
2. Decide whether the locale **code** is `en` (prefix) or `en-US` (code + prefix). Today
   `code: "en"`, `htmlLang: "en"` — mixed. Keep the prefix `en`, set code/htmlLang `en-US`, and
   verify `getContentFieldSuffix` (`En` → `EnUs` if you change the code — **check this before
   changing the code**, it drives CMS content columns). This is the one place where the `en` →
   `en-US` change can silently orphan CMS content. Do not change the code without tracing that.
3. Formatting defaults (`en-US`, `USD`) already match.
4. Copy: `am/pm`, `customize`, spelling follow US conventions — the 9 keys from Commit 1 are
   already US English.

### Locale follow-up prompt (Commit 5)

> Gate 4, **Commit 5 — locale policy, en-US base.**
>
> **Step 0 — report, no edits.** Determine: (a) which locales are enabled in DB/seed
> configuration (enabled-locale rows / `seeds/`), (b) every test or fixture that references
> `messages/ar.json` or `messages/id.json`, (c) every consumer of `getContentFieldSuffix` and
> `CONTENT_SUFFIX_BY_CODE` so the `en` → `en-US` code change is known-safe or stopped,
> (d) where `htmlLang` is rendered.
>
> **Step 1 (after approval)** — choose per my answer:
> - `en-US` html language: set the default locale `htmlLang` to `"en-US"`; keep URL prefix `en`;
>   do **not** change `code` unless (c) proves the content-suffix path safe.
> - Payload policy: Option A (delete `messages/ar.json`, `messages/id.json` + fix tests) or
>   Option B (move to `messages/optional/` + loader fallback). **Default A, unless (a) shows
>   either locale enabled in any environment.**
>
> **Step 2** — update `final-report.md` §5 and §7: the storefront i18n debt shrinks to the items
> that still exist; note the removed locales and how to re-add one (admin scaffold path).
> Append a backlog item: "adding a locale = admin `scaffoldMessageFile` + translation pass; no
> code change required."
>
> Commit as `i18n: English (en-US) base locale; translated payloads optional`. Stop.

---

## Final status

| Phase | State |
| --- | --- |
| Phase A review | Complete (`docs/apple-design/` report set) |
| Gate 1–2 | Complete and accepted |
| Gate 3 | Complete and accepted (`535bf619` closed the lockup overrides) |
| Gate 4 | Complete (`4721a35a`) |
| Commit 5 (locale policy) | Pending decision in this document |
| Browser / AT verification | **Open** — 11 items, `final-report.md` §7 |
| Security / perf workstream | Not in this review — parallel, uncommitted |
