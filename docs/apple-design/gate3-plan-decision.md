# Gate 3 Step 0 — plan review and approval decision

Base: `6be887c9`. Tree: verified — only security workstream paths dirty, one stash
(`stash@{0}`). A1 evidence: verified in `MobileMenuPreview.tsx:735–752` (early
`setAnimState("open")` with no rAF when the motion query matches, try/catch guarded). A1 code
closed; browser check still open.

## Decision

**Approved with corrections.** The plan is sound: it correctly corrected the two dark-mode
on-fill failures *before* shipping, which is exactly what Step 0 is for. Four corrections are
required before execution; three are blockers.

### Blocker 1 — `--az-accent` is not a free name (functional conflict)

`--az-accent` already exists and is written by the theme engine at runtime:
`src/features/theme/engine/colors.ts:18` (in `SHARED_KEYS`) sets it from the user's theme
`accent` on `html.style.setProperty`; `src/lib/theme/tokens/aliases.ts:22` aliases it to
`--accent`. Redefining `--az-accent` in `responsive-tokens.css` **collides with the theme
engine** and with `[data-theme]` / preset surfaces.

Rename the brand role token: **`--az-brand`** (light `#0E6B5C`, dark `#3DCFB4`) and
`--az-on-brand` (light `#FFFFFF`, dark `#12141A`). Do not touch `--az-accent` in this gate.

Related and worth knowing: `--cp` already resolves to `var(--color-primary, var(--primary))`, and
the primary is the user's chosen brand color (default gold). So `header-builder.css`'s
`var(--cp, #1a5f82)` fallbacks are **themer-backed**, not hard-coded brand colors — replacing them
with `--az-brand` would override the user's primary everywhere the fallback is reached. Keep
`var(--cp, var(--az-brand))`; only the literal `#1a5f82` / `#fff` fallbacks change, not the
`--cp` lookup.

### Blocker 2 — badge/success/warning hex inventory is broader than the plan

The planned hex swaps cover `product-pdp.css` and `product-card-styles.css` only. The scan finds
status-bearing literals in more places, and they will read inconsistently if half are tokenized:

| File | Hex | Meaning |
| --- | --- | --- |
| `product-pdp.css:794–822, 860` | `#00b67a` (×5) | stock "in stock" green |
| `product-pdp.css:960–962` | `#10b981` | stock green |
| `product-pdp.css:966–968` | `#8b5cf6` | stock/backorder purple |
| `product-card-styles.css:75` | `#16a34a` | availability green |
| `product-card-styles.css:100` | `#ef4444` | sale badge |
| `product-card-styles.css:104–105` | `#f59e0b`, `#111` | badge warning |
| `product-card-styles.css:180–182` | `#ef4444` (×3) | sale/compare |
| `header-builder.css:1345, 2354`, `2661` | `#fff` | text on primary |
| `header-builder.css:1887–2654` | `#1a5f82` (×8), `#475569`, `#f1f5f9`, `#00e5ff` | fallbacks |

Put the **whole inventory** in the plan's file list with the target token for each, or say
explicitly which stay (e.g. `#00b67a` on a payment badge may be a brand-partner color, not a status).
Also: `product-card-styles.css:104–105` `#f59e0b` + `#111` is a warning badge whose text color must
come from `--az-on-status-*`, not a new literal.

### Blocker 3 — light-mode status text fails on tinted backgrounds

The table validated `X on canvas` and `on-X on fill`, but not `X on 10%-tint-of-X`, which is the
actual badge pattern in these files (`color: #10b981; background: color-mix(#10b981 10%,
transparent)`). Computed:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `#0F7A4A` on 10% `#0F7A4A` over `#F7F6F3` | **4.37 : 1** | ❌ below 4.5 for body text |
| `#A15C07` on 10% `#A15C07` over `#F7F6F3` | **4.22 : 1** | ❌ |

Corrected values (darken; dark-mode statuses already pass on tint at 7.19 / 7.62):

- `--az-status-success` light → **`#0E6E42`** (5.84 on canvas, 5.05 on its own 10% tint)
- `--az-status-warning` light → **`#8F5206`** (5.75 on canvas, 5.02 on its own 10% tint)

Rule to adopt: every status token must pass **both** `token on canvas ≥ 4.5` and
`token on 10% token-over-canvas ≥ 4.5` in light mode. Assert it in the plan's table.

Two more corrections to the plan: use `transparent` (not `var(--background)`) as the
`color-mix` base, because these stylesheets are used under dark themes where `--background`
flips; and badge fills should use the `on-*` token for text.

### Correction 4 — the card-style rename is a product decision, not cleanup

`data-card-style` is a **user-facing theme setting**: `CARD_STYLE_OPTIONS`
(`src/features/theme/card-style-options.ts:3–5`) offers labels "Glassmorphism" and **"Liquid
Glass"** in the theme studio, and presets `agency` / `saas` map to `glassmorphism`
(`preset-style-map.ts:11,17`).

Cards are already opaque, so the label now lies: a user choosing "Liquid Glass" gets an opaque
surface with no explanation. Gate 3 must not rename the stored value (migration risk), but it
**must** resolve the dishonesty. Recommended: keep storage keys, rewrite the labels to what the
surface actually does — `"Surface"` and `"Glassmorphism"` → e.g. `"Lifted surface"` /
`"Frosted chrome (cards stay opaque)"` — and backlog a proper rename with a data migration. If
you prefer to leave labels untouched in Gate 3, say so explicitly; then the backlog item must name
the label mismatch as the risk, not the rename.

## Approved token table (as corrected)

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--az-canvas` | `#F7F6F3` | `#12141A` | **Name clash, low risk:** `--az-canvas-well` exists in `globals.css:58` and `theme/engine/colors.ts:42`. `--az-canvas` is a distinct custom-property name, so no overwrite; note it. |
| `--az-ink` | `#1A1C22` | `#F2F0EB` | 15.76 / 16.16 |
| `--az-ink-muted` | `#5C6170` | `#A8ADB8` | 5.72 / 8.18 |
| `--az-brand` (was `--az-accent`) | `#0E6B5C` | `#3DCFB4` | 5.93 / 9.45 |
| `--az-on-brand` | `#FFFFFF` | `#12141A` | 6.41 / 9.45 |
| `--az-danger` | `#B42318` | `#F97066` | 6.08 / 6.61 |
| `--az-on-danger` | `#FFFFFF` | `#12141A` | 6.57 / 6.61 |
| `--az-status-success` | **`#0E6E42`** | `#3DCF8E` | corrected; dark on-tint 7.19 |
| `--az-status-warning` | **`#8F5206`** | `#F0B429` | corrected; dark on-tint 7.62 |
| `--az-status-info` | `#1B5F8A` | `#5BB8E8` | 6.37 / 8.30 |
| `--az-status-danger` | `= --az-danger` | `= --az-danger` | |
| `--az-chrome` / `--az-chrome-solid` | `#FFFFFF @92%` / `#FFFFFF` | `#1C1F28 @92%` / `#1C1F28` | reduce-transparency path |
| `--az-preset-radius-card` / `--az-preset-shadow-card` | keep | keep | canonical for durable cards |

All other figures in the submitted table verified independently by recomputation and correct.

## Gate 3 execution prompt (post-approval)

> Execute Gate 3 now on base `6be887c9`, on a clean tree (verify; stop if non-security dirt is
> present). Use the corrected token table above, including `--az-brand` / `--az-on-brand` and the
> darkened light statuses.
>
> **Commit 1 — `a11y: Gate 3 pre-reqs`**: G2-C1 (reset fading on non-navigating paths +
> `useEffect([pathname, locale])`), G2-C2 (drop `aria-live`, keep `role="status"`), G2-C3 (confirm
> locale-aware `/categories`), `.pl-empty-cta { min-height: 44px }`.
>
> **Commit 2 — `tokens: Apple role tokens`**: add the role + status + `on-*` tokens to
> `src/styles/responsive-tokens.css` under `:root` and `.dark` (read the existing dark selector
> before adding — match it, do not invent). Comment block with the enforced rule:
> *body text token-on-canvas ≥ 4.5 AND token-on-10%-tint ≥ 4.5 in light; dark must pass the same*.
> **Do not touch `--az-accent` / `--az-color-accent` / `--accent`.**
>
> **Commit 3 — `tokens: status and legacy hex → roles`**: full inventory from Blocker 2 (all
> `#00b67a`, `#10b981`, `#8b5cf6`, `#16a34a`, `#ef4444`, `#f59e0b`, `#111`, `#1a5f82`, `#fff`
> occurrences in the four named stylesheets), base tints on `transparent`, text on filled badges
> from `--az-on-*`, and `--cp` fallbacks become `var(--cp, var(--az-brand))` (never replace the
> `--cp` lookup itself). Print a table: file:line → old hex → new token → on-canvas / on-tint ratio.
>
> **Commit 4 — `brand: storefront lockup`**: `HeaderBrand` / logo-area type weight, tracking,
> color via `--az-ink` + brand accent mark only. No new font file, no SVG redraw. Cards untouched.
>
> **Commit 5 — `chore: drop card !important`**: remove `!important` from
> `site-glass-effect.css:559–568`; re-run the card-blur scan and paste the result (must stay 0).
>
> **Then:** print the before/after contrast table (both modes, all statuses, including on-tint),
> the grep proof for accent/brand scoping (brand appears only on primary actions, focus rings,
> and the lockup), and the standard hand-off. Stop at the Gate 3 boundary. Nothing in admin,
> portal, CMS builder, data-platform, feeds, emails, or `--az-accent` consumer paths.

### Gate 3 acceptance checklist (updated)

- [ ] `grep -rn -- "--az-accent"` shows **no new** writer in `responsive-tokens.css`.
- [ ] Token file dark selector matches the existing mechanism exactly (`grep` the diff).
- [ ] Light status on-tint ratios ≥ 4.5 for success/warning/danger/info.
- [ ] Hex inventory table complete; residual literals explained line by line.
- [ ] Card-blur scan still 0 after `!important` removal.
- [ ] Theme studio labels addressed (or explicitly deferred with the label-mismatch risk backlogged).
- [ ] Diff touches only the five commit groups' files (plus the case-labelled pre-req file).
