# Phase B Apple Design — final report

Base `6be887c9` → `HEAD` (`acb30a95`). Design work is **code-complete, not browser-verified**.
Section 7 is the deliverable that goes back to the team.

---

## 1. Commits per gate

### Gate 1 — accessibility foundations

| SHA | Message | Effect |
| --- | --- | --- |
| `16b76b58` | a11y: Gate 1 focus rings, hit targets, names, motion, contrast | Focus rings, 44px hits, named controls, motion/contrast baselines |
| `3522e27d` | nav: soft NavLink + Radix dialog mobile menu | Soft nav; Radix dialog mobile menu (A1 groundwork) |
| `6f66d732` | a11y: Gate 1 acceptance follow-ups | Acceptance gaps A1–A4 |

### Gate 2 — glass discipline / empty / locale

| SHA | Message | Effect |
| --- | --- | --- |
| `6be887c9` | nav: Gate 2 glass discipline, empty states, locale settle | Chrome-only glass; empty states; locale settle motion |

### Gate 3 — tokens / lockup / card honesty

| SHA | Message | Effect |
| --- | --- | --- |
| `a1828a25` | a11y: Gate 3 pre-reqs | G2-C follow-ups; empty CTA 44px |
| `14e5daa0` | tokens: Apple role tokens | `--az-brand` / ink / canvas / chrome (not `--az-accent`) |
| `4075a6be` | tokens: status and legacy hex → roles | Status tokens + hex inventory migration |
| `e0d296e1` | brand: storefront lockup | Ink wordmark + teal rule |
| `a472a207` | chore: drop card !important; honest card-style labels | Opaque card honesty; Theme Studio labels |

### Gate 4 — lockup fixes / copy / dark / forced-colors / report

| SHA | Message | Effect |
| --- | --- | --- |
| `535bf619` | brand: lockup respects branding settings | G3-R1/R2/R3 |
| `44f27a5c` | copy: Gate 4 storefront copy, en only | 9 approved `messages/en.json` keys |
| `fb388df8` | tokens: dark-mode contrast sweep | Real-surface contrast table; **no value changes** |
| `acb30a95` | a11y: forced-colors coverage for status badges | Sale / low-stock / savings / wishlist / PDP stock |
| `4721a35a` | docs: final report | Seven-section Phase B report |
| *(Commit 5)* | i18n: English (en-US) base locale; translated payloads optional | `htmlLang: en-US`; remove `ar`/`id` message payloads; seed strips non-default locales |

---

## 2. Before / after contrast (both modes, including on-tint)

### Gate 3 fixes (failed → fixed)

Light **on-tint** failed for the first status drafts; corrected in `4075a6be` / plan:

| Token | Before (light on-tint) | After value | After light on-tint | Dark on-tint |
| --- | --- | --- | --- | --- |
| success | `#0F7A4A` ≈ 4.37 ❌ | `#0E6E42` | 5.05 ✅ | 7.77 ✅ |
| warning | too light on tint ❌ | `#8F5206` | 5.02 ✅ | 8.29 ✅ |
| info | (passed draft) | `#1B5F8A` | 5.51 ✅ | 7.09 ✅ |
| danger | (passed) | `#B42318` | 5.17 ✅ | 5.83 ✅ |
| brand | (passed) | `#0E6B5C` | 5.14 ✅ | 7.95 ✅ |

Dark **on-fill** uses dark ink (`#12141A`) on bright status fills — verified in Gate 3 acceptance (all ≥ 4.5).

### Gate 4 Commit 2 — verified against real surfaces (no further fixes)

Surfaces read from `theme-surfaces.ts` defaults (`#0a0f18` / `#020408` dark; `#ffffff` / `#fafafa` light), `--az-canvas`, and `--az-chrome-solid`. Full tables: `docs/apple-design/gate4-dark-contrast.md`.

| Check | Result |
| --- | --- |
| All Gate 3 tokens as text on theme surface / bg / canvas / chrome-solid | Pass both modes |
| Token on 10% and 14% tint over those surfaces | Pass (worst light ≈ 4.71 warning; worst dark ≈ 4.83 danger on chrome-solid) |
| On-fill (`--az-on-status-*` on status) | Pass both modes |
| Wishlist danger on 12% tint | Pass |
| Non-computable | `.pl-card` 85%/55% transparent mixes; `dark_premium` content overlay; default `--az-chrome` 92% transparent; badges on product imagery |

**Gate 4 dark sweep: verified-only — zero token edits.**

---

## 3. Residual hex (kept deliberately)

| Hex / use | Reason |
| --- | --- |
| Trustpilot `#00b67a` (`.prd-trust*`) | Third-party mark guidelines (same logic as Apple Pay artwork) |
| WhatsApp `#25d366` | Partner brand color |
| Star `#ffc107` | Rating glyph convention |
| Media chrome `#fff` / `#000` overlays | Contrast on arbitrary imagery, not brand roles |
| `.pl-card__stock-badge` `#ef4444` / `#fff` | **Missed Gate 3 inventory residual** — still hardcoded; forced-colors path added in Gate 4; token migration backlog |

---

## 4. Product changes along the way

| Change | Notes |
| --- | --- |
| Card-style Theme Studio labels | "Soft surface (opaque)" / "Lifted surface (opaque)"; storage keys unchanged |
| Lockup | Ink wordmark + teal rule; weight/tracking/color respect Branding panel (G3-R1) |
| English copy (9 keys) | `44f27a5c` — loading ellipsis, CTA case, 404 body, stock tip, locale hint, contact success/error, compare empties |
| `common.pageNotFoundBody` | **Accurate and inert.** Live 404 is `src/app/[locale]/not-found.tsx` → `MarketingMaintenancePage` → `maintenance.*` (Contact Us / Inquire Now / phone / email). The string becomes live only if the route starts consuming it. |
| Locale policy (Commit 5) | Base is English: `code`/`urlPrefix` stay `en`; `htmlLang` is `en-US`. `messages/ar.json` and `messages/id.json` removed from the repo (optional add-ons). Seed/setup deletes every non-default locale row so DB rows cannot outlive payloads. |

---

## 5. What did not get fixed — storefront i18n debt

Of ~28 storefront strings flagged in the Gate 4 copy audit, **9** landed in `messages/en.json`. The Indonesian/Arabic UI-payload debt was **retired by deleting those files** (Commit 5) — not by translating them. What remains is **English storefront i18n debt outside `messages/`** — keys + wiring, not another design gate.

| Location | Examples / scope |
| --- | --- |
| `search-copy.ts` | Entire `SEARCH_COPY.en` (~40 strings); `searchCopy()` always returns English |
| `load-pdp-labels.ts` catalog fallbacks | `inStock`, `preOrder`, `outOfStock`, `buyNow`, `quantity`, `compare*`, `save*`, `condition*`, `stockTooltip`, services/warranty strings |
| `listing-labels.ts` / `load-listing-labels.ts` | Filters, empty results, pagination, sort, search placeholders, clear filters |
| Component aria literals | e.g. `Close search`, `Condition`, `Decrease quantity` / `Increase quantity`, `Close filters`, `View mode`, gallery zoom labels, MobileMenuPreview close/search |

**Re-adding a locale:** admin `scaffoldMessageFile` → translation pass → enable `LocaleConfig` row. No code change required. Recover a prior Arabic/Indonesian UI payload from git history if a deployment needs it.

Do not mark Phase B “complete” as having fixed storefront copy end-to-end.

---

## 6. Security / perf handoff (outside this review)

| Item | Status |
| --- | --- |
| CSP headers workstream (`csp-headers.ts`, report route, tests) | Parallel dirty tree — **not in Phase B** |
| `defineApiRoute` / API auth lint (`check-api-auth.mjs`, route wrappers) | Parallel — **not in Phase B** |
| Lint-changed / lint debt scripts | Parallel — **not in Phase B** |

---

## 7. Manual browser / AT checklist

Design pass is code-complete. **These need a human with a device.** Every line is marked; none claimed verified in this report.

| # | Check | Mark |
| --- | --- | --- |
| 1 | Viewports 320 / 768 / 1280 / 1600 — storefront chrome, cards, PDP | **Unverified** |
| 2 | VoiceOver — mobile nav (open/close, tabs, links) | **Unverified** |
| 3 | VoiceOver — PDP gallery (thumbs, zoom, close) | **Unverified** |
| 4 | Forced Colors — sale / low-stock / wishlist saved / PDP stock / savings | **Unverified** |
| 5 | Increase Contrast (`prefers-contrast: more`) — badges keep a border; chrome opaque | **Unverified** |
| 6 | Keyboard-only — mega-menu traversal | **Unverified** |
| 7 | Keyboard-only — search panel open / type / escape | **Unverified** |
| 8 | Reduce Motion — resize across 968px with menu closed (A1): panel appears with no entrance animation | **Unverified** |
| 9 | Dark theme storefront — lockup, status badges, chrome (incl. sticky) | **Unverified** |
| 10 | Bottom-nav caption density at 320px | **Unverified** |
| 11 | Empty-state CTA hit target at 320px (does not dominate) | **Unverified** |

### Hand-off line for the team

> Design pass done — these eleven things need a human with a device (section 7). Code is complete through Commit 5 (en-US `htmlLang`, English-only message payloads); browser/AT verification is the remaining gate to “done.” Security/perf (CSP, `defineApiRoute`, lint debt) remains a parallel uncommitted workstream.
