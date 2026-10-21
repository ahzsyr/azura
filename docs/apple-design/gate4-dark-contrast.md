# Gate 4 Commit 2 — dark-mode contrast sweep

Method: surfaces read from code (not assumed `--az-canvas` alone). Ratios recomputed with
WCAG relative luminance. Body threshold ≥ 4.5; large ≥ 3.0 (none of these tokens are
large-only). **No token values changed** — every computable pair already passes.

## Surfaces read

| Surface | Source | Value used |
| --- | --- | --- |
| Theme card / `--sur` / `--card` / `--color-surface` (dark) | `theme-surfaces.ts` `DEFAULT_DARK_SURFACES.surface` | `#0a0f18` |
| Theme page `--background` (dark) | `DEFAULT_DARK_SURFACES.background` | `#020408` |
| Theme card (light) | `DEFAULT_LIGHT_SURFACES.surface` | `#ffffff` |
| Theme page (light) | `DEFAULT_LIGHT_SURFACES.background` | `#fafafa` |
| `--az-canvas` light / dark | `responsive-tokens.css` | `#f7f6f3` / `#12141a` |
| `--az-chrome-solid` light / dark | `responsive-tokens.css` | `#ffffff` / `#1c1f28` |
| `--az-chrome` (default) | `color-mix(…solid 92%, transparent)` | **not-computable** (underlay-dependent) |
| `--az-chrome` + `prefers-reduced-transparency` | falls back to `--az-chrome-solid` | solid values above |
| `.pl-card` base bg | `product-listing.css` `color-mix(sur 85%, transparent)` + blur | **not-computable** |
| `.pl-card[data-prd-style="glass"]` | `sur 55%` transparent | **not-computable** |
| `.pl-card[data-prd-style="dark_premium"]` content | `color-mix(t 88%, transparent)` | **not-computable** |
| Badge on media image | product photo underlay | **not-computable** |
| PDP stock pill `10%` tint over transparent | composites with page/panel behind | computed as 10%/14% tint **over** the known theme surfaces above |
| Live sticky header chrome | `header-builder.css` uses `--color-surface` mixes, not `--az-chrome` yet | treat as theme surface / chrome-solid |

`--az-chrome` is defined in Gate 3 tokens but **not yet referenced** by header CSS; reduce-
transparency chrome uses `--color-surface` / `--card` opaque. Sweep still validates the token
pair for when chrome binds to it.

## Text on surface (body ≥ 4.5)

| Token | Light surface | Light bg | Light canvas | Light chrome-solid | Dark surface | Dark bg | Dark canvas | Dark chrome-solid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ink | 17.03 ✅ | 16.32 ✅ | 15.76 ✅ | 17.03 ✅ | 16.85 ✅ | 18.02 ✅ | 16.16 ✅ | 14.45 ✅ |
| ink-muted | 6.18 ✅ | 5.92 ✅ | 5.72 ✅ | 6.18 ✅ | 8.53 ✅ | 9.12 ✅ | 8.18 ✅ | 7.32 ✅ |
| brand | 6.41 ✅ | 6.14 ✅ | 5.93 ✅ | 6.41 ✅ | 9.85 ✅ | 10.54 ✅ | 9.45 ✅ | 8.45 ✅ |
| danger | 6.57 ✅ | 6.30 ✅ | 6.08 ✅ | 6.57 ✅ | 6.89 ✅ | 7.36 ✅ | 6.61 ✅ | 5.91 ✅ |
| success | 6.31 ✅ | 6.05 ✅ | 5.84 ✅ | 6.31 ✅ | 9.61 ✅ | 10.27 ✅ | 9.22 ✅ | 8.24 ✅ |
| warning | 6.22 ✅ | 5.96 ✅ | 5.75 ✅ | 6.22 ✅ | 10.29 ✅ | 11.01 ✅ | 9.88 ✅ | 8.83 ✅ |
| info | 6.88 ✅ | 6.60 ✅ | 6.37 ✅ | 6.88 ✅ | 8.65 ✅ | 9.25 ✅ | 8.30 ✅ | 7.42 ✅ |

## Token on 10% / 14% tint over surface (pill text)

Worst-case per token (lowest ratio among the four computable underlays × 10%/14%):

| Token | Light worst | Dark worst |
| --- | ---: | ---: |
| brand | 4.85 ✅ (14% / az-canvas) | 6.36 ✅ (14% / chrome-solid) |
| danger | 4.82 ✅ (14% / az-canvas) | 4.83 ✅ (14% / chrome-solid) |
| success | 4.77 ✅ (14% / az-canvas) | 6.25 ✅ (14% / chrome-solid) |
| warning | 4.71 ✅ (14% / az-canvas) | 6.62 ✅ (14% / chrome-solid) |
| info | 5.18 ✅ (14% / az-canvas) | 5.73 ✅ (14% / chrome-solid) |

Wishlist `.is-saved` (danger on 12% tint): light worst 5.01 ✅; dark worst 4.96 ✅ (chrome-solid).

## On-fill (solid sale / low-stock badges)

| Pair | Light | Dark |
| --- | ---: | ---: |
| on-brand / brand | 6.41 ✅ | 9.45 ✅ |
| on-danger / danger | 6.57 ✅ | 6.61 ✅ |
| on-success / success | 6.31 ✅ | 9.22 ✅ |
| on-warning / warning | 6.22 ✅ | 9.88 ✅ |
| on-info / info | 6.88 ✅ | 8.30 ✅ |

## Verdict

Verified-only against real theme surfaces and chrome-solid. **No contrast fixes required.**
Non-computable surfaces listed above stay browser-check items (dark storefront checklist).
