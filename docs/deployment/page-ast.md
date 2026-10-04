# Page AST envelope contract

## Purpose

CMS pages, posts, and content items persist layout as a **versioned Page AST** inside the existing `composition` JSON column. Lifecycle status (`DRAFT` / `PUBLISHED`) lives on the CMS entity and revision pointers — never inside the AST.

## Envelope shape

```ts
type PageAstDocument = {
  version: number; // PAGE_AST_VERSION (currently 1)
  composition: Composition; // layout + regions + hiddenRegions + metadata
  blocks?: PageBlocks; // optional flat primary-region mirror
  meta?: {
    locale?: string;
    label?: string;
    [key: string]: unknown;
  };
};
```

## Migration invariants

1. **Read-time upgrade** — `compositionService.load` / `loadDocument` accept:
   - Page AST envelopes (`version` + nested `composition`)
   - Legacy bare `Composition` objects (`layout` + `regions`)
   - Legacy flat block arrays (via `blocks` or array `composition`)
2. **Write path** — `compositionService.save` always emits a `version: 1` envelope.
3. **Dual-write** — The `blocks` column remains the primary-region array for legacy consumers.
4. **No status in AST** — Never store `draft` / `published` on the document; use entity `status` and `workingRevisionId` / `publishedRevisionId`.
5. **Version bumps** — Increment `PAGE_AST_VERSION` only for incompatible envelope changes; add a corresponding upgrade branch in `loadDocument`.

## Related code

- Types: `src/features/cms/page-ast/`
- Persist/normalize: `src/features/layout-engine/composition.service.ts`
