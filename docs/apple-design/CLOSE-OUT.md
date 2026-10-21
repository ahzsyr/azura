# Phase B close-out — Apple Design

Design phase closed at `4f497629`. Code-complete and locale-hardened. **Not shipped-verified.**

Rating against the skill bar (from acceptance): Phase A was Needs work; after Phase B the same
lens gives **Good, pending verification**. Excellent only if §7 passes clean; back to Needs work
if increase contrast, Forced Colors, Reduce Motion resize (A1), the dark storefront, or Safari
chrome-tint boot identity (#12) fails on a real device — spend the first verification hour there.

---

## 1. Final-state table

| Item | State |
| --- | --- |
| Phase A design review | Complete — `docs/apple-design/` |
| Gate 1 (a11y correctness) | Accepted |
| Gate 2 (material layer, empty states) | Accepted |
| Gate 3 (tokens, status, lockup) | Accepted — lockup overrides closed in `535bf619` |
| Gate 4 (copy, dark, forced-colors, report) | Accepted — `4721a35a` |
| Locale policy (en-US base, payloads optional) | Accepted — `72e663eb`, `4f497629` |
| **Browser / AT verification** | **OPEN — 12 items below; all currently UNASSIGNED (blocker)** |
| **Safari chrome-tint device pass** | **UNRUN** — item #12; code complete at `44e83323`+ |
| **Live-locale query per environment** | **UNRUN** |
| Security / perf workstream | Out of scope, parallel, uncommitted |

---

## 2. §7 verification owners

Every row needs a named person and a device/AT. **UNASSIGNED is a ship blocker** until filled and
run. Pass criteria are one line each.

| # | Check | Owner | Device / AT | Pass criterion |
| --- | --- | --- | --- | --- |
| 1 | Viewports 320 / 768 / 1280 / 1600 — chrome, cards, PDP | **UNASSIGNED** | Phone + tablet + desktop browser | No horizontal overflow; lockup/chrome readable; cards opaque at all four widths |
| 2 | VoiceOver — mobile nav | **UNASSIGNED** | iPhone / iPad + VoiceOver | Open/close, tabs, and links announce correctly; focus does not escape the panel |
| 3 | VoiceOver — PDP gallery | **UNASSIGNED** | iPhone / iPad + VoiceOver | Thumbs, zoom, and close are named and operable; zoom dismisses cleanly |
| 4 | Forced Colors — status badges | **UNASSIGNED** | Windows High Contrast / Forced Colors | Sale, low-stock, wishlist saved, PDP stock, savings remain distinguishable (border/system colors; no tint-only meaning) |
| 5 | Increase Contrast | **UNASSIGNED** | macOS Increase Contrast / `prefers-contrast: more` | Badges keep a border; chrome/header surfaces go opaque (no glass bleed) |
| 6 | Keyboard — mega-menu | **UNASSIGNED** | Desktop keyboard only | Full traversal open → items → escape/close without mouse; visible focus throughout |
| 7 | Keyboard — search panel | **UNASSIGNED** | Desktop keyboard only | Open, type, navigate results, Escape closes; focus returns sensibly |
| 8 | Reduce Motion — resize across 968px (A1) | **UNASSIGNED** | Desktop, Reduce Motion on | Menu closed; resize across 968px; panel appears with **no** entrance animation |
| 9 | Dark theme storefront | **UNASSIGNED** | Desktop/mobile dark mode | Lockup (ink + teal rule), status badges, and sticky chrome readable on real dark surfaces |
| 10 | Bottom-nav captions at 320px | **UNASSIGNED** | 320px-wide viewport | Four labels remain legible; no severe clip/overlap |
| 11 | Empty-state CTA at 320px | **UNASSIGNED** | 320px-wide viewport | CTA meets 44px hit target and does not dominate the empty state |
| 12 | Safari chrome-tint boot identity | **UNASSIGNED** | Safari iOS (real device) | After clearing `devi-user-preset*`, hard-reload ×3: paint 1 ≡ paint 3 for `data-theme`, `meta[theme-color]`, `--az-browser-chrome-tint`, `--az-site-glass-tint`; dark mode has no light chrome before dark paint; light status bar matches header fill (not scroll-sample brown); personalization apply updates status bar at hydration |

### Blockers (unassigned)

All twelve checks are **UNASSIGNED**. Until owners are named and results recorded (pass/fail + date
+ environment), browser/AT verification remains a **blocker** between “done on paper” and “done.”

**Verify first (skill rating):** #5 Increase Contrast · #4 Forced Colors · #8 Reduce Motion resize ·
#9 Dark storefront · **#12 Safari chrome tint** (code-complete; human-only proof, same category as the rest of §7).

---

## 3. Live-locale check (per environment)

Run against **every** deployed database (production, staging, and any preview that shares locale
config). Local compose (`mysql://…@mysql:3306`) was unreachable from the design-pass machine — do
not treat “unrun here” as “clean everywhere.”

```sql
SELECT code, "isEnabled", "isDefault", "urlPrefix", "htmlLang"
FROM "LocaleConfig"
ORDER BY "sortOrder";
```

**Pass:** only `en` is enabled (or the only enabled default). Any other `isEnabled = true` row is a
finding: either disable/delete it, or scaffold `messages/{code}.json`, translate, and keep it
deliberately.

**Record results in:** `docs/apple-design/live-locale-checks.md` (create on first run), one section
per environment:

```md
## <env-name> — <YYYY-MM-DD>
- Runner:
- Connection: (host / db name only — no credentials)
- Result: (paste query rows or “en only”)
- Action taken: (none / disabled X / scaffolded Y)
```

Also tick the backlog line in `docs/apple-design/backlog.md` when every environment is recorded.

---

## 4. For non-designers

Shoppers will notice clearer focus rings when tabbing, larger tap targets on key controls, status
colors (in stock / sale / warning) that stay readable on light and dark pages, and product cards
that look solid rather than frosted. The site header wordmark sits in ink with a teal accent mark
on chrome only — one deliberate brand moment instead of glass everywhere. Store admins will see
honest Theme Studio card labels (“Soft surface (opaque)” / “Lifted surface (opaque)”) and an
English base language (`html lang` en-US) with add-on locales created through admin scaffold rather
than shipping half-translated files. What this pass did **not** touch: CSP, API auth wrappers,
lint debt, and the rest of the security/perf workstream — those remain a parallel uncommitted tree.
What is still pending: twelve manual checks on real devices and assistive tech (including the
Safari chrome-tint boot pass after `44e83323`), plus the live LocaleConfig query on each
environment.

---

## 5. If you ship before verification — risk list

| # | Check | Risk if skipped |
| --- | --- | --- |
| 4 | Forced Colors | **User-visible regression risk** — status meaning can disappear for high-contrast users |
| 5 | Increase Contrast | **User-visible regression risk** — tint-only badges / glass chrome can fail the OS contrast path |
| 8 | Reduce Motion resize (A1) | **User-visible regression risk** — motion-sensitive users may see a forbidden entrance animation |
| 9 | Dark storefront | **User-visible regression risk** — lockup/badges/chrome may fail on real dark surfaces (computable pairs passed; imagery/translucent mixes did not) |
| 2 | VoiceOver mobile nav | **User-visible regression risk** — nav may be unusable or mis-announced for VoiceOver users |
| 3 | VoiceOver PDP gallery | **User-visible regression risk** — gallery/zoom may trap or lack names |
| 6 | Keyboard mega-menu | **User-visible regression risk** — keyboard-only shoppers may not reach catalog paths |
| 7 | Keyboard search | **User-visible regression risk** — search may be mouse-only in practice |
| 1 | Viewports | **Confirmation-only** for layout polish — overflow/clip possible but not a new a11y path |
| 10 | Bottom-nav 320px captions | **Confirmation-only** — density/clip; captions may truncate without breaking action |
| 11 | Empty CTA 320px | **Confirmation-only** — hit target was coded to 44px; visual dominance is judgment |
| 12 | Safari chrome-tint boot | **User-visible regression risk** — purple/wrong preset flash, light→dark chrome flash, or brown status bar from scroll sample vs header glass |

Shipping before #4, #5, #8, #9, or #12 is the highest chance of walking the rating back to Needs work.

---

## Hand-off

> Design pass closed (`4f497629`); chrome-tint root causes fixed in code (`44e83323`+). Assign the
> twelve §7 owners, run the five priority checks first (#5 · #4 · #8 · #9 · #12), run the
> live-locale SQL on every environment and file results under
> `docs/apple-design/live-locale-checks.md`. Security/perf stays out of this close-out. Stop adding
> surface area — verify what landed.
