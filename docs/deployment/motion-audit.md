# Motion ownership (Phase 5)

Canonical split for animation libraries. See also [technology-policy.md](./technology-policy.md).

## Policy

| Library | Role |
|---------|------|
| **`motion/react`** | Normal UI transitions, presence, layout, admin chrome, marketing block affordances |
| **GSAP** | Complex timelines / text effects only — do not use interchangeably with Motion |

Do not reintroduce `framer-motion` as a direct import. The `motion` package is the successor.

## Motion (`motion/react`) — Category A

- `src/hooks/use-constrained-motion.ts`
- `src/components/motion/animated-section.tsx`
- `src/components/motion/lazy-motion.tsx`
- `src/components/theme/theme-mode-toggle.tsx`
- `src/components/personalization/personalization-panel.tsx`
- `src/components/admin/layout/admin-motion.tsx`
- `src/components/admin/layout/admin-sidebar.tsx`
- `src/components/admin/layout/admin-settings-layout.tsx`
- `src/components/admin/layout/admin-settings-ribbon.tsx`
- `src/features/builder/blocks/media/components/video-hero-view.tsx`
- `src/features/builder/blocks/marketing/lib/visual-layer-motion.ts`
- `src/features/builder/blocks/marketing/components/composite-visual-stage.tsx`
- `src/features/builder/blocks/marketing/components/frame-sequence-player.tsx`
- `src/features/builder/blocks/marketing/components/tabbed-showcase-view.tsx`

## GSAP — Category B (justified retention)

| File | Why GSAP |
|------|----------|
| `src/features/builder/blocks/marketing/components/hero-motion-client.tsx` | Multi-step hero timeline; dynamic `import("gsap")` |
| `src/features/theme/effects/text.ts` | Text effect sequencing; dynamic `import("gsap")` |

Consolidate a GSAP site to Motion only when the rewrite is trivial and behavior-equivalent. Do not rewrite working timelines for purity.

## State ownership (companion)

| Concern | Technology |
|---------|------------|
| URL state (page, search, filters, locale query) | **nuqs** |
| Admin transient UI (sidebar, dialogs, toasts, builder chrome) | **Zustand** |
| CMS data / mutations | Server Components / Server Actions |
| Client search cache / prefetch | **TanStack Query** only under `src/capabilities/search/query/` |

Nanostores: removed. Do not reintroduce.
