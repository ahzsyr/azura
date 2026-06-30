import { randomUUID } from "node:crypto";
import type {
  ContentSignals,
  ContentSnapshot,
  ContentSnapshotDraft,
  SeoExecutionContext,
} from "../../types";

function computeSignals(draft: ContentSnapshotDraft): ContentSignals {
  const h1Count = draft.headings.filter((h) => h.level === 1).length;
  const h2Count = draft.headings.filter((h) => h.level === 2).length;
  const wordCount = draft.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return {
    h1Count,
    h2Count,
    wordCount,
    paragraphCount: draft.paragraphs.length,
    imageCount: draft.images.length,
    imagesMissingAlt: draft.images.filter((img) => !img.alt?.trim()).length,
    internalLinkCount: draft.links.internal.length,
    externalLinkCount: draft.links.external.length,
    hasFaq: draft.faq.length > 0,
    hasCta: draft.paragraphs.some((p) => /contact|buy|shop|get started/i.test(p)),
    hasTable: draft.tables.length > 0,
    hasList: draft.paragraphs.some((p) => /^[-*•]\s/m.test(p)),
  };
}

export function freezeContentSnapshot(
  ctx: SeoExecutionContext,
  draft: ContentSnapshotDraft
): ContentSnapshot {
  const signals = computeSignals(draft);
  const snapshot: ContentSnapshot = {
    id: randomUUID(),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    localeCode: ctx.locale,
    title: draft.title,
    headings: Object.freeze(draft.headings.map((h) => Object.freeze({ ...h }))),
    paragraphs: Object.freeze([...draft.paragraphs]),
    tables: Object.freeze(draft.tables.map((row) => Object.freeze([...row]))),
    images: Object.freeze(draft.images.map((img) => Object.freeze({ ...img }))),
    links: Object.freeze({
      internal: Object.freeze([...draft.links.internal]),
      external: Object.freeze([...draft.links.external]),
    }),
    faq: Object.freeze(draft.faq.map((item) => Object.freeze({ ...item }))),
    products: Object.freeze(draft.products.map((p) => Object.freeze({ ...p }))),
    language: draft.language,
    signals: Object.freeze(computeSignals(draft)),
    capturedAt: new Date().toISOString(),
  };
  return Object.freeze(snapshot);
}

export function mergeAnalyzerDraft(
  draft: ContentSnapshotDraft,
  patch: Partial<ContentSnapshotDraft>
): ContentSnapshotDraft {
  return {
    title: patch.title ?? draft.title,
    headings: patch.headings ?? draft.headings,
    paragraphs: patch.paragraphs ?? draft.paragraphs,
    tables: patch.tables ?? draft.tables,
    images: patch.images ?? draft.images,
    links: patch.links ?? draft.links,
    faq: patch.faq ?? draft.faq,
    products: patch.products ?? draft.products,
    language: patch.language ?? draft.language,
  };
}

export function emptyDraft(title = ""): ContentSnapshotDraft {
  return {
    title,
    headings: [],
    paragraphs: [],
    tables: [],
    images: [],
    links: { internal: [], external: [] },
    faq: [],
    products: [],
    language: "en",
  };
}
