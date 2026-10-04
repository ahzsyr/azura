# BlockNote pilot (Phase 1.5 → Phase 5 decision)

**Phase 5 decision: C — intentional coexistence.**

| Editor | Role |
|--------|------|
| **TipTap** | Production **default** for advanced rich-text fields |
| **BlockNote** | Flagged pilot (`AZURA_BLOCKNOTE_PILOT=1`) on the same field surface only |

Rationale: acceptance checklist (RTL, tables, paste, toolbar parity, lossless HTML bridge) is **not** fully met. TipTap remains canonical. BlockNote stays available for continued evaluation without an indefinite unlabeled pilot. Future graduation to **A** (progressive BlockNote) or retirement to **B** (TipTap only) requires completing the checklist below and an explicit policy update.

Opt-in evaluation of [BlockNote](https://www.blocknotejs.org/) beside TipTap. **Not** a TipTap replacement.

## Boundary

BlockNote is for **field-level** rich text inside CMS forms only. It must not define Page AST / macro layout nodes.

## Enable

```bash
AZURA_BLOCKNOTE_PILOT=1
```

Inlined into the client bundle via `next.config.ts` `env.AZURA_BLOCKNOTE_PILOT`. Restart `next dev` / rebuild after changing it. `NEXT_PUBLIC_AZURA_BLOCKNOTE_PILOT=1` is also accepted.

When unset (or not `"1"`), `AdvancedRichTextBlockFields` continues to load TipTap `AdvancedRichTextEditor`.

## Scope

| Area | Behavior |
|------|----------|
| Packages | `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn` (Tailwind-friendly shadcn UI) |
| Pilot code | `src/features/builder/blocks/content/admin/blocknote-pilot/` |
| Wired field | Advanced rich-text block admin fields only |
| TipTap files | Retained — do not delete `advanced-rich-text*` |
| Public render | Unchanged — stored HTML via `AdvancedRichTextView` |

## Storage contract

- **`content*`** — TipTap-compatible ProseMirror JSON (stable-stringified) so disabling the flag does not brick TipTap.
- **`html*`** — HTML for public render (`blocksToHTMLLossy` while the pilot is active).
- Serializers also produce a BlockNote envelope (`{ format: "blocknote", version: 1, blocks }`) for evaluation; the envelope is **not** written to props in this phase.

```
Existing TipTap JSON / HTML  ⇔  BlockNote document  ⇔  Public HTML / TipTap JSON payload
```

See `serializers.ts`, `format.ts`, `stable-json.ts`.

## Acceptance criteria checklist

### Parity with TipTap extensions (Azura advanced-rich-text)

- [ ] Paragraph + headings (H1–H4) with optional heading anchors
- [ ] Bold / italic / strike / underline / code
- [ ] Links (open-on-click off in admin; styled for public)
- [ ] Images (align, upload/paste/drop)
- [ ] Text align
- [ ] Highlight / text color
- [ ] Indent / nest
- [ ] Text direction (LTR/RTL)
- [ ] Tables (resize / width)
- [ ] Placeholder + slash menu UX parity (or documented intentional delta)
- [ ] Bubble / formatting toolbar coverage for the above
- [ ] Character / word count (or documented intentional omission)

### Storage & render

- [ ] Deterministic JSON for MySQL Json (`stableStringify` — sorted keys; same doc → same string)
- [ ] Round-trip TipTap JSON → BlockNote → TipTap JSON preserves core structure for fixture corpus
- [ ] Round-trip HTML → BlockNote → HTML acceptable for public render fixtures
- [ ] Public pages still sanitize / color-adapt via existing `AdvancedRichTextView`
- [ ] Locale-suffixed `content*` / `html*` sections unchanged

### Product / ops

- [ ] Flag off restores TipTap UI with no content migration required
- [ ] Bundle / admin load impact measured (dynamic import, `ssr: false`)
- [ ] No global style leakage (shadcn + scoped `.cb-blocknote-pilot`)
- [ ] Docs updated when exiting pilot

## Current known gaps

- HTML bridge is **lossy** for TipTap-only features (heading anchors, image align, indent, text-direction, table width, some colors).
- BlockNote UI does not yet mirror the full Azura TipTap toolbar / slash / bubble menus.
- Pilot banner is intentional so editors know TipTap is still the default path.

## Exit criteria (future)

Only after checklist parity and a dual-write / migration plan: remove the flag, swap the default editor, and retire TipTap admin packages in a dedicated phase — not this pilot.
