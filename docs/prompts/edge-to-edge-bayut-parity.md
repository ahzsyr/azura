# Agent prompt — Bayut-style edge-to-edge glass (Azura)

Copy everything below the line into a new Agent chat. Attach the Bayut + safeermedina screenshots if available.

---

## Role

You are a senior macOS / mobile web UI engineer working in the **Azura** Next.js monorepo. Goal: make the **site chrome** behave like the Bayut mobile reference — content extends under the site bar; the bar frosts the page; Theme Studio styles Glass / Transparent / Solid / Gradient all work — without chasing unsupported browser-omnibox translucency.

## Hard platform truth (do not violate)

| Layer | Controllable? | Mechanism |
| --- | --- | --- |
| Site header capsule (logo, nav, search) | **Yes** | CSS `backdrop-filter` + tint + edge-to-edge underlay |
| Status / home-indicator band (safe area) | **Partial** | `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style=black-translucent`, edge tint strips |
| Safari/Chrome address bar, tab strip, bottom toolbar | **No** | Opaque `theme-color` only; Safari 26+ samples edge pixels |

Bayut’s floating bottom toolbar glass is **browser-owned**. Azura’s product contract (Theme Studio copy + `docs/apple-design/edge-to-edge-implementation.md`): translucency applies to the **site bar + device edges**; the browser’s own toolbar stays an opaque theme color. Do not invent CSS that claims to frost the OS omnibox.

## Reference vs current

- **Wanted (Bayut):** hero / page content continuous under top UI; frosted site chrome; edge-to-edge.
- **Reported (safeermedina.com device):** dark status band + cream empty band where the site bar should be; heavy white haze; bottom Safari bar solid cream. Theme Studio shows Glass 70%, Primary basis, Edge-to-edge on, iOS Black Translucent.
- **Root causes already documented:**
  1. Production SSR often **missing** `data-edge-to-edge` while a newer client chunk injects chrome layers → half-deploy.
  2. Site-level **`data-glass-effect="off"`** → “Glass 70%” has nothing to frost (flat fill).
  3. Local code bugs E1–E5 (hero double-pad, logo clip, primary tint silent, haze without header, desktop band axis) — fixed in-tree; re-apply/verify with the script below.

## Skills / evidence (use what exists)

1. Read `.agents/skills/apple-design/SKILL.md` if present (or the known local Apple Design skill). Load ~8–12 HIG refs: `materials.md`, `liquid-glass.md`, `layout.md`, `color.md`, `dark-mode.md`, `accessibility.md`, `cross-platform.md`.
2. Read project audits before coding:
   - `docs/apple-design/transparency-glass-compositing-audit-v2.md`
   - `docs/apple-design/edge-to-edge-implementation.md`
   - `docs/apple-design/edge-to-edge-device-fixes.md`
   - `docs/browser-chrome-theme-sync.md`
3. Browser: prefer repo Playwright / `scripts/ds/fix-edge-to-edge.mjs --verify`; else cursor-ide-browser. Capture mobile 393×852 screenshots of home (hero under bar) and scrolled.
4. Do **not** re-litigate unsupported Dynamic Browser Chrome (content-sampled omnibox).

## Existing fix script (run first)

```bash
node scripts/ds/fix-edge-to-edge.mjs --check     # dry-run
node scripts/ds/fix-edge-to-edge.mjs             # apply CSS patches E1–E4 (idempotent)
node scripts/ds/fix-edge-to-edge.mjs --verify    # apply + Chromium verify (8 checks)
node scripts/ds/fix-edge-to-edge.mjs --prod-check https://safeermedina.com/
# ↑ deploy gate: reports data-edge-to-edge / data-glass-effect / theme-color / viewport-fit
```

Source plumbing (attrs, projection, defaults) is **already in application code** — do not re-invent via AST in the script. If `--check` reports missing anchors, reconcile with current CSS instead of force-writing.

## Required product settings (Theme Studio → Mobile Browser)

Match the attached settings screenshot **and** enable Liquid Glass at site level:

| Setting | Required value | Why |
| --- | --- | --- |
| Sync with active theme | on | Projection owns colors |
| Chrome tint style | `glass` \| `transparent` \| `solid` \| `gradient` as chosen | Four distinct fills (`edge-to-edge.css`) |
| Glass strength | e.g. 70% | Maps to fill alpha / chrome tint opacity for glass styles |
| Color basis | `surface` or `primary` | Must emit `data-chrome-tint-source` on `.header-root` |
| Edge-to-edge page | **on** | Emits `data-edge-to-edge="on"`; content under site bar |
| iOS status bar | **Black Translucent** | Content behind status bar |
| **Site Liquid Glass / glass effect** | **enabled** (`data-glass-effect="liquid"`) | Without this, Glass style is a flat fill — matches safeermedina failure |

Persist via published SiteTheme (Theme Studio save / publish), not only localStorage.

## Implementation checklist (code — only if gaps remain after script)

1. Confirm SSR emits on marketing pages:
   - `html[data-chrome-tint-style]`
   - `html[data-glass-effect="liquid"]` when glass is on
   - `.header-root[data-edge-to-edge="on"]`
   - `.header-root[data-chrome-tint-source]`
   - `meta[name="theme-color"]`, `viewport-fit=cover`, Apple status bar meta
2. Confirm `ChromeEdgeLayers` mounts and sets `--az-chrome-band`, `[data-az-underlay]`, scroll-edge fade; hide layers when `data-has-site-header="false"`.
3. Hero / first-block: under `[data-az-underlay="true"]` do **not** double-apply `.block-first-with-header-overlay` negative margin (E1).
4. Mobile `.site-header`: `overflow: visible` so masked logos paint (E2).
5. Primary wash: rules scoped to `.header-root[data-chrome-tint-source="primary"][data-edge-to-edge]` (E3).
6. Four styles remain distinct when `data-glass-effect=liquid` (edge-to-edge.css specificity over `site-glass-effect.css`).
7. Dark appearance: `--az-site-glass-tint` must be dark surface (`#0a0f18` family), never leftover light `#f8fafc` (v2 F2).
8. A11y: `prefers-reduced-transparency` / `prefers-contrast: more` → opaque appearance-aware fills.

## Deploy / production gate (safeermedina)

After merge:

1. Rebuild + redeploy the **full** app (SSR + client chunks must match).
2. `curl -sL https://safeermedina.com/ | grep -E 'data-edge-to-edge|data-glass-effect|data-chrome-tint'`  
   Pass: `data-edge-to-edge` present; for translucency `data-glass-effect="liquid"` (or site equivalent).
3. Real iPhone Safari: hard-reload ×3; confirm site bar visible, logo visible, hero frosted through glass, no cream empty band, no haze without header.
4. Toggle Theme Studio styles Glass / Transparent / Solid / Gradient and screenshot each.

## Acceptance (Bayut-parity for *site* chrome)

- [ ] Home hero media visible **through** the frosted site bar at rest (mobile).
- [ ] Scroll: content passes under the bar with scroll-edge fade; no double jump.
- [ ] Logo + search + menu visible (not clipped).
- [ ] Primary color basis visibly tints glass when selected.
- [ ] Edge-to-edge off restores normal flow (margin tuck = 0).
- [ ] Solid/Gradient opaque; Transparent/Glass show page through the bar.
- [ ] Dark mode: dark tint, nav ≥ 4.5:1 on composited bar.
- [ ] Production SSR attributes match local after deploy.
- [ ] Explicit non-goal signed off: browser bottom toolbar remains opaque theme-color.

## Constraints

- Prefer smallest diffs; reuse `edge-to-edge.css`, `chrome-edge-layers.tsx`, tint projection.
- Do not rewrite Theme Studio or liquid-glass architecture unless a verified gap requires it.
- Audit-only claims need CDP/Playwright measurements; do not “lower alpha over white” as a root fix (v2 rejected that).
- Commit only when the user asks.

## Deliverables

1. Short status: script `--check` / `--verify` results; remaining code gaps (if any).
2. Before/after mobile screenshots under `docs/apple-design/evidence/`.
3. Production curl attribute dump + redeploy note for safeermedina.
4. If Theme Studio glass effect was off: exact steps to enable + publish.

---

## One-liner for a follow-up agent

> Run `node scripts/ds/fix-edge-to-edge.mjs --verify`, enable site Liquid Glass + edge-to-edge in published Theme Studio, redeploy safeermedina until SSR shows `data-edge-to-edge` and `data-glass-effect="liquid"`, then verify home hero frosts through the site bar on iPhone Safari. Do not try to frost the browser omnibox.
