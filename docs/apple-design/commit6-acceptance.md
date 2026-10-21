# Commit 6 acceptance — `4f497629` — ACCEPTED. Design phase closed.

## Verification

| Item | Result |
| --- | --- |
| Remap at the message-loading boundary (`request.ts`) | ✅ correct placement — this is where English-under-foreign-`lang` originates |
| Default prefix skips the FS check | ✅ — avoids one stat per request on the hot path |
| Non-default prefix without a payload → default prefix **and** recomputed `code` | ✅ both remapped, so `<html lang>`, hreflang, `og:locale`, and the message bundle now agree |
| `code` recomputed after remap (not stale) | ✅ |
| Admin `htmlLang` default + BCP-47 helper; existing value preserved | ✅ |
| Docs §5 + backlog | ✅ |
| 4 files, +25/−4 | ✅ scoped |

**On the design choice:** rejecting `filterActivePublicLocales` was correct and the reason given is
the right one. That function is synchronous and consumed across shell, SEO, and admin paths; making
it async on a filesystem probe would fan out cost and could hide a locale mid-scaffold — exactly
the window this guard is meant to tolerate gracefully rather than erase.

**Minor note, no action:** `getDefaultUrlPrefix()` is not wrapped in React `cache()` while its
neighbours (`getEnabledLocales`, `isValidUrlPrefix`) are. Low impact because `localeService` is
almost certainly DB-cached, but worth a one-line check if request latency ever shows it.

**Known limitation, by design:** the remap rewrites the message/`lang` context but leaves the
**URL** as requested — `/ar/…` renders English chrome with `lang="en-US"`, it does not redirect to
`/en/…`. Said plainly: "not routable as an untranslated shell" is true for `lang`/hreflang, not
for the address bar. Acceptable for the stated policy (payload absence is a broken deployment
state), and it is the safer failure because a redirect could loop if the stale row is the default.
If you ever want `/ar/…` to land on `/en/…`, that is an explicit 301 in middleware, not a change
here.

---

## Final state

| Item | State |
| --- | --- |
| Phase A design review | Complete — `docs/apple-design/` |
| Gate 1 (a11y correctness) | Accepted |
| Gate 2 (material layer, empty states) | Accepted |
| Gate 3 (tokens, status, lockup) | Accepted — lockup overrides resolved in `535bf619` |
| Gate 4 (copy, dark, forced-colors, report) | Accepted — `4721a35a` |
| Locale policy (en-US base, payloads optional) | Accepted — `72e663eb`, `4f497629` |
| **Browser / AT verification** | **OPEN — 11 items, `final-report.md` §7** |
| **Live-locale query per environment** | **UNRUN** |
| Security / perf workstream | Out of scope, parallel, uncommitted |

### Gate history

`16b76b5` Gate 1 · `6f66d732` acceptance A2–A4 · `6be887c9` Gate 2 · `a1828a25` pre-reqs ·
`14e5daa0` tokens · `4075a6be` status migration · `e0d296e1` lockup · `a472a207` !important +
labels · `535bf619` lockup overrides · `44f27a5c` copy · `fb388df8` dark sweep · `acb30a95`
forced-colors · `4721a35a` final report · `72e663eb` locale base · `4f497629` locale hardening.

---

## Close-out prompt (no code)

> Phase B close-out. **No code edits.** Produce `docs/apple-design/CLOSE-OUT.md`:
>
> 1. The final-state table above, verbatim in content.
> 2. **Owner assignment** for each of the eleven §7 checks: who verifies it, on which device/AT,
>    and the pass criterion in one line each. Unassigned is a failure; if an owner is unknown,
>    write `UNASSIGNED` and list it under "blockers".
> 3. The exact SQL to run for the live-locale check, per environment, and where to record the
>    result (`docs/apple-design/backlog.md` → live-locale check).
> 4. A one-paragraph team summary written for non-designers: what changed for users (opaque cards,
>    visible focus rings, 44px targets, readable status colors), what changed for admins (card
>    style labels), what did not change (security, API, lint debt), and what is still pending.
> 5. A short "if you ship before verification" risk list — which of the eleven items could plausibly
>    be a regression that a user would see, versus which are confirmation-only.
>
> Commit as `docs: apple design phase B close-out`. Then stop. This ends the design phase unless a
> §7 check fails.

---

## Final rating against the skill's own bar

Phase A rated the work **Needs work** with a memory point ("optional liquid glass on product
cards") that was exactly where Apple says glass must not live. After Phase B the same lens gives:

- **Accessibility**: focus rings, names, 44px touch targets, reduced motion, reduced transparency,
  forced-colors and increase-contrast paths all present in code. Cannot claim *Excellent* until
  §7 passes — the skill's rule is that the platform verdict follows from verified behavior.
- **Conventions**: adapted for web as scoped; no native menu-bar defects invented.
- **Craft**: the design now has exactly one bold element (ink wordmark + teal rule on chrome),
  opaque cards, one motion moment. The templated risk — "glass on everything" — is gone.
- **Content**: 9 keys fixed; the ~19 outside `messages/` remain, correctly named as i18n debt.

Verdict: **Good, pending verification.** It becomes **Excellent** only if §7 passes without
regressions and the ledger stays clean; it becomes **Needs work** again if any of items 2–5, 8, or 9
(increase contrast, forced colors, reload on resize, dark theme) fail on a real device.
