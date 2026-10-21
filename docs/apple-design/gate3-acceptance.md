# Gate 3 acceptance review — verdict

Commits: `a1828a25`, `14e5daa0`, `4075a6be`, `e0d296e1`, `a472a207` on base `6be887c9`.
Method: all five diffs read; token contrasts recomputed independently from the committed values;
card-blur and reduced-transparency surfaces re-scanned from `HEAD`.

## Verdict

**Accepted with two required fixes (both Small, both in `header-builder.css`).** The three
blockers from Step 0 were handled correctly:

| Step 0 blocker | Result |
| --- | --- |
| 1. `--az-accent` collision | ✅ `--az-brand` / `--az-on-brand` defined, `--az-accent` untouched; comment states why |
| 2. Hex inventory | ✅ stock trio, card availability/sale/low-stock/wishlist, `--cp` fallbacks, `--fff` on primary all migrated; partner/media/neutral residuals named |
| 3. Light on-tint contrast | ✅ `#0E6E42` / `#8F5206` in the file; recomputed below |
| Product decision: card labels | ✅ "Lifted surface (opaque)" / "Soft surface (opaque)"; storage keys unchanged; migration backlogged |

Contrast recomputed from `responsive-tokens.css` (light `#F7F6F3` / dark `#12141A` canvas):

| Token | Light canvas | Light 10% tint | Dark canvas | Dark tint |
| --- | --- | --- | --- | --- |
| success | 5.84 ✅ | 5.05 ✅ | 9.22 ✅ | 7.77 ✅ |
| warning | 5.75 ✅ | 5.02 ✅ | 9.88 ✅ | 8.29 ✅ |
| info | 6.37 ✅ | 5.51 ✅ | 8.30 ✅ | 7.09 ✅ |
| danger | 6.08 ✅ | 5.17 ✅ | 6.61 ✅ | 5.83 ✅ |
| brand | 5.93 ✅ | 5.14 ✅ | 9.45 ✅ | 7.95 ✅ |

Every pair in the hand-off matches. Dark mechanism uses `.dark`, matching the existing selector,
not an invented `data-theme`.

Other checks: `CARD_BLUR_HITS=0` re-verified — the `!important` removal is safe because no
competing rule targets the card surface. Reduce Transparency now has **three** coherent layers
(token fallback in `responsive-tokens.css:156`, chrome rules in `header-builder.css:2508`,
storefront glass). Pre-req commit included G2-C1/C2/C3 and the 44px empty CTA.

---

## Required fixes

### G3-R1 · Brand lockup removes a brand-product capability — High

`e0d296e1` hard-sets `.brand-name { font-weight: 750; letter-spacing: 0.035em; }` and
`.brand-name:not([data-text-effect="gradient-flow"])` to `-webkit-text-fill-color: var(--az-ink)`.
But these are **user-configurable brand settings**:

- `branding-defaults.ts:136` writes `--brand-name-font-weight` from the Branding panel
  (`nameTypo.fontWeight`). A weight of 750 overrides **every** store's chosen weight.
- The same CSS previously said *"Track active preset primary. Text effects (neon /
  gradient-flow / …) own extra paint."* — the wordmark was bound to the theme primary, and the
  comment documented that as intent. A solid ink fill now overrides that binding.

This is the design-craft tension in the skill: the lockup is the signature, but it must not
delete a setting the product sells. The acceptable version:

```css
.brand-name {
  font-weight: var(--brand-name-font-weight, 750);   /* 750 only as fallback */
  letter-spacing: var(--brand-name-tracking, 0.035em); /* new var, default = lockup */
  color: var(--az-ink, var(--primary));
}
```

and keep `--primary` as the *design-system* fallback rather than removing it. If you want the ink
wordmark to be unavoidable, it needs a product decision in the Branding panel ("lockup mode"),
not a silent override in CSS. Decide and say which; do not leave 750 unconditional.

### G3-R2 · The tagline now declares `letter-spacing` twice; the first is dead — Low

`header-builder.css:263–270`: `letter-spacing: 0.02em;` then, four lines later,
`letter-spacing: 0.04em;`. The second wins and the first is a no-op — the classic "two owners of
one value" smell. Keep `0.04em` and delete `0.02em`, or vice versa if 0.04 was accidental.

### G3-R3 · Lockup mark duplicates on the Logo-only / Text-only layouts — Medium

The mark is `border-inline-start` on `.brand-text`, suppressed only for
`data-brand-mobile|desktop="text-only"`. `BrandLayoutBreakpoint` is
`"logo-only" | "text-only" | "logo-and-text"` (`src/features/navigation/types.ts:295`) and
BrandingPanel exposes all three per breakpoint. Confirm what `logo-only` renders for
`.brand-text` — if it renders empty but painted, the store gets a stray 2px teal rule floating
left of the logo. Add `logo-only` to the suppression list unless the empty element is
`display: none` (verify in `HeaderBrand.tsx`, not by assumption).

---

## Notes (no action required in Gate 3)

1. **Brand preview surfaces also show the change.** `CatalogNavScopedPreview.tsx` and
   `theme-preview-panel.tsx` carry `data-card-style`; the label rewrite shows up in the theme
   studio panel, which is correct.
2. **`.pl-empty` CTA 44px** landed with the pre-reqs; confirm in Gate 4's visual sweep that the
   button does not dominate the 320px empty state.
3. Residual partner hex (`#00b67a`, `#25d366`) is a defensible call — third-party marks carry
   their own guidelines, same reasoning as Apple Pay artwork in `code-audit.md`.
4. The lockup is now the storefront's one bold element: wordmark ink + teal rule, chrome only,
   cards opaque, one motion. That is the intended thesis. Let Gate 4 not add a second accent.

---

## Gate 4 prompt

> Phase B, **Gate 4** — final gate, based on `a472a207`. Standing rules apply. No layout, token,
> motion, or component-structure changes.
>
> **Commit 0 — `brand: lockup respects branding settings`**: G3-R1 (restore
> `--brand-name-font-weight` as the primary value with the lockup as fallback; restore the
> design-system `--primary` fallback for the wordmark fill, or record the "lockup mode" product
> decision and its UX entry point), G3-R2 (single `letter-spacing` on `.brand-tagline`), G3-R3
> (verify `logo-only`; add to the suppression list if `.brand-text` is painted).
>
> **Commit 1 — copy audit, table first, wait for approval** then edit only `messages/`:
> storefront strings on header/nav, announcement bar, listing, PDP purchase + stock states,
> search panel, forms spot-check, empty/error states. Apply `writing.md`: label says what happens,
> the action's name holds through the flow, errors direct, empty states invite, capitalization
> consistent. Report untranslatable keys per locale explicitly; no silent machine translation.
>
> **Commit 2 — dark-mode sweep**: every Gate 3 token and status in dark mode against the dark
> storefront surface actually used by `.pl-card` / `.prd-*` (read the dark card background, do not
> assume `--az-canvas`), plus `.az-chrome` on dark. Report pairs; fix contrast only.
>
> **Commit 3 — high-contrast sweep**: confirm every Gate 3 status token used in a badge has a
> forced-colors path from Gate 1; opaque `Canvas`/`CanvasText` only; no gradient fills in
> forced-colors mode.
>
> **Commit 4 — `docs/apple-design/final-report.md`**: four gates, commits, before/after contrast
> for both modes including on-tint, the residual-hex justification, the theme-studio label change,
> the remaining browser/AT checklist, and the security/perf handoff recap. Append unfixed items to
> `backlog.md` with `path:line` + owner gate.
>
> Then print the hand-off and stop. Do not touch CSP, API auth, lint debt, or admin IA.

### Gate 4 acceptance checklist

- [ ] G3-R1/R2/R3 closed; brand settings still demonstrably configurable (grep the var path).
- [ ] Copy table approved before edits; every key has a locale in each of en/ar/id or a flag.
- [ ] Dark-mode table computed against the real dark card/PDP surfaces.
- [ ] Forced-colors coverage for status badges verified by reading the Gate 1 block.
- [ ] `final-report.md` exists, with the manual browser/AT checklist and the handoff recap.
