# Gate 4 Commit 1 — acceptance + Commits 2–4 go-ahead

## Commit 1 — `44f27a5c` — ACCEPTED

`messages/en.json` only, 9 keys, plus `docs/apple-design/backlog.md`. No `ar` / `id` edits. Diff
verified line by line against the approved set.

The 404 investigation earned its keep: the route renders Contact Us / Inquire Now / phone / email
and **no** home link or search field, so naming search would have promised a control that does
not exist — and `common.pageNotFoundBody` is currently unused by the TS, meaning the live 404 copy
is `maintenance.*`. The new body names only the two real CTAs. Correct call, and worth recording:
the string is now accurate but inert. It becomes live only if/when the 404 route starts
consuming it.

`contact.error` retry-only is the honest wording given no support address in the form.

---

## Drift introduced deliberately (record, do not fix here)

The English copy now says "contact us or send an inquiry" and "Add items from the catalog" while:

| Locale | State | Effect |
| --- | --- | --- |
| `ar` | native Arabic remains (e.g. `pageNotFoundBody: الصفحة التي تبحث عنها غير موجودة.`) | **meaning-preserving**, no action needed |
| `id` | `pageNotFoundBody` and the other eight keys remain **English-held** and now hold the *old* English | Indonesian visitors see "Loading..." where English sees "Loading…"; "The page you are looking for does not exist." where English names the CTAs. Minor, but it is now visible drift. |

This is already covered by the Indonesian backlog item; add one line to it: "nine keys now hold
superseded English — translate from the current `en` values, not from memory."

---

## Commits 2–4 go-ahead

> Gate 4, **Commits 2–4**, base `44f27a5c`. Standing rules; no layout, token, motion, or
> component-structure changes. Do not touch `messages/`, `ar`/`id`, or any non-security path.
>
> **Commit 2 — `tokens: dark-mode contrast sweep`.** Read the real dark surfaces first:
> - the dark background of `.pl-card` / `.pl-card__*` (from `product-card-styles.css` and the
>   theme surface resolution, **not** assumed `--az-canvas`)
> - the dark background of `.prd-purchase__stock` badge pills and the PDP panel
> - `.az-chrome` on dark, including its reduce-transparency variant
>
> Then compute and print: every Gate 3 token (ink, ink-muted, brand, danger, status ×4) on each
> of those surfaces, both as text color and as 10% / 14% tinted pill background with the token as
> text. Flag anything below 4.5 body / 3.0 large. **Fix contrast only** — do not retune hues for
> taste. If a dark surface is not a fixed color (image underlay, gradient), say so and mark it
> not-computable rather than estimating.
>
> **Commit 3 — `a11y: forced-colors coverage for status badges`.** Read the Gate 1 block in
> `src/styles/site-glass-effect.css`. For each class now using `--az-status-*` /
> `--az-on-status-*` (sale badge, low-stock badge, availability line, wishlist saved, PDP stock
> states), confirm a `forced-colors: active` path exists. Add only what is missing: opaque
> `Canvas` / `CanvasText` / `Highlight` semantics, `background-image: none`, a border where a fill
> carried the meaning. No decorative gradients in forced-colors mode. Also confirm `prefers-contrast:
> more` does not leave a badge with a tinted fill and no border.
>
> **Commit 4 — `docs: final report`.** Write `docs/apple-design/final-report.md`:
> 1. Commits per gate (SHA, message, one-line effect), base `6be887c9` → `HEAD`.
> 2. Before/after contrast tables, both modes, including on-tint; state which values were fixed
>    because they failed (dark on-fill, light on-tint) and which were verified-only.
> 3. Residual hex kept deliberately, with the reason per item.
> 4. Product changes made along the way: card-style labels, English copy set, the inert
>    `pageNotFoundBody`, locale drift in `id`.
> 5. **What did not get fixed**: the ~19 copy keys outside `messages/` (search-copy.ts,
>    load-pdp-labels.ts catalog fallbacks, listing labels, component aria literals) — named as
>    i18n debt, not polish.
> 6. The security/perf handoff recap (CSP, defineApiRoute, lint debt) — one line each, explicitly
>    outside this review.
> 7. **Manual browser/AT checklist**, unchanged and unclaimed: viewports 320 / 768 / 1280 / 1600;
>    VoiceOver on mobile nav and PDP gallery; Forced Colors and Increase Contrast; keyboard-only
>    mega-menu and search panel; Reduce Motion resize across 968px (A1); dark theme storefront
>    (lockup, badges, chrome); bottom-nav caption at 320px; empty-state CTA at 320px.
>
> Commit the final report and print the hand-off. Then stop. Phase B is complete when this
> checklist has a verified/unverified mark against every line — not before.

### Acceptance checklist for Commits 2–4

- [ ] Dark table computed against surfaces read from code, not assumed tokens; non-computable
      surfaces listed as such.
- [ ] Every status badge has a forced-colors path; no tint-only meaning without a border.
- [ ] `final-report.md` contains all seven sections, and section 7 marks each item verified or
      still pending — no blanket "done".
- [ ] No edits outside the named files; `messages/` untouched; `ar`/`id` untouched.
