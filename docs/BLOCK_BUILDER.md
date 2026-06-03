# Block Builder System (v2)

Enterprise-grade modular block architecture for AZURA CMS pages, posts, and content items.

## Architecture

```
Block Registry (definitions)
       ↓
Block Instance (per-page JSON, unique id)
       ↓
Migration → Validation → Style / Visibility / i18n resolution
       ↓
BlockWrapper + BlockRenderer → Marketing components
```

### Block instance shape

Each block on a page is an independent instance:

```json
{
  "id": "hero_001",
  "type": "hero",
  "version": "2.0",
  "settings": { "titleEn": "Welcome", "ctaHref": "/contact" },
  "styles": { "minHeight": "50vh" },
  "responsive": { "mobile": { "hide": false } },
  "localization": { "translations": { "title": { "en": "A", "ar": "ب" } } },
  "visibility": {},
  "seo": {},
  "animation": { "enabled": true, "entrance": { "type": "fade" } }
}
```

- **Unlimited instances**: Same `type` may repeat on one page (e.g. three heroes with different `id` and `settings`).
- **No shared state**: Styles and settings are scoped to `id`; use `BlockWrapper` for isolated CSS.
- **Backward compatible**: Legacy v1 blocks (`props` only) auto-upgrade on load via `migrateBlocksToBlockSystem()`.

## Registry

Location: `src/features/builder/registry/`

- `block-registry-system.ts` — singleton `blockRegistry`
- `definitions.ts` — metadata, defaults, translatable fields per type

```ts
import { blockRegistry } from "@/features/builder";

const hero = blockRegistry.get("hero");
```

## Core modules

| Module | Path | Purpose |
|--------|------|---------|
| Instance | `instance/block-instance.ts` | Normalize, create, upgrade, `getBlockSettings()` |
| Styles | `styles/style-resolver.ts` | Layout, typography, colors, theme tokens |
| Responsive | `styles/style-resolver.ts` | Desktop / tablet / mobile overrides |
| Visibility | `visibility/visibility-resolver.ts` | Auth, role, locale, URL, date/time, flags |
| Localization | `localization/block-localization.ts` | Per-instance translations + fallback chain |
| Animation | `animation/animation-resolver.ts` | Entrance / hover / scroll classes |
| SEO | `seo/block-seo.ts` | JSON-LD, OG, robots |
| Migration | `migration/upgrade-blocks.ts` | Legacy catalog + v1 → v2 |
| Clipboard | `clipboard/block-clipboard.ts` | Copy, paste, import, export JSON |

## Admin editor

- **BlockEditor** — drag-and-drop tree + inspector card
- **BlockInspectorShell** — ribbon tabs: Content | Style | Responsive | Animation | Visibility | Advanced
- **BlockEditorToolbar** — duplicate, copy, paste, export, import
- **Style tab** — nested Layout / Type / Colors / More with layout presets, color picker, font family select
- **Responsive tab** — per-device hide, layout overrides, typography, alignment
- **Animation tab** — entrance / scroll / hover type, duration, delay, easing
- **First-block header overlay** — when the site header is **boxed**, enable “Display site header over this block” on the first root block (Style → Layout)

### Layout presets

| Preset field | Options |
|--------------|---------|
| Width | Full width, Content fit, Custom |
| Max width | Full bleed, Page width (80rem), Wide, Narrow, Custom |
| Min height | Auto, 40/50/75vh, Full screen, Custom |
| Section spacing | None, Compact, Default, Large, Custom |

Resolved at render time in `styles/layout-preset-resolver.ts`.

### Header overlay (boxed header)

Configured in **Header admin → Style → Header overlay** (`settings.firstBlockHeaderOverlay` on the header workspace). Surface uses `settings.overlaySurface`.

On CMS pages, the first block receives pull-up padding via `block-first-with-header-overlay` when overlay is enabled. `PageHeaderOverlayCoordinator` (in `HeaderRenderer`) sets `#headerRoot` overlay attributes when the header style is `boxed-*`.

Templates and presets remain in `builder.service` (`BLOCK_PRESETS_NAMESPACE`, `BLOCK_TEMPLATES_NAMESPACE`).

## Theme integration

Pass `ThemeTokens` into `resolveBlockStyles({ theme })`. Blocks may set `styles.tokenOverrides` or raw values. Published site theme CSS variables apply globally via `ThemeStyles`.

## Validation

`builderService.validateBlocks()` runs:

1. `migrateBlocksToBlockSystem()`
2. `pageBlocksSchema` (Zod, includes v2 fields)

## Tests

```bash
npm run test:blocks
npm run test:i18n
```

Block tests live in `src/features/builder/__tests__/`. Existing i18n tests are unchanged.

## Adding a new block type

1. Add to `BlockType` in `src/types/builder.ts`
2. Add Zod props in `src/schemas/builder/props.ts` and `BLOCK_DEFAULTS`
3. Register in `registry/definitions.ts` (auto from `BASE_META`)
4. Add `switch` cases in `block-renderer.tsx` and `block-field-editor.tsx`
5. Add translatable fields in `block-translation.ts`
