import type { BlockNode, PageBlocks } from "@/types/builder";
import type { ContentSnapshotDraft } from "../../types";
import { emptyDraft } from "./snapshot-builder";

const TEXT_PROP_KEYS = [
  "title",
  "titleEn",
  "titleAr",
  "heading",
  "subtitle",
  "subtitleEn",
  "subtitleAr",
  "text",
  "textEn",
  "textAr",
  "body",
  "bodyEn",
  "bodyAr",
  "content",
  "contentEn",
  "contentAr",
  "description",
  "descriptionEn",
  "descriptionAr",
  "excerpt",
  "label",
  "caption",
  "question",
  "answer",
];

function collectStrings(value: unknown, out: string[]): void {
  if (value == null) return;
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length > 1) out.push(t);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
}

function extractFromBlock(block: BlockNode, draft: ContentSnapshotDraft): void {
  const data = { ...block.props, ...block.settings };

  if (block.type === "faq" || block.type === "productFaq") {
    const items = data.items ?? data.faqs ?? data.questions;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          const question = String(row.question ?? row.questionEn ?? row.title ?? "").trim();
          const answer = String(row.answer ?? row.answerEn ?? row.text ?? "").trim();
          if (question) draft.faq.push({ question, answer });
        }
      }
    }
  }

  if (block.type === "table") {
    const rows = data.rows ?? data.data;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (Array.isArray(row)) {
          draft.tables.push(row.map((cell) => String(cell ?? "").trim()));
        }
      }
    }
  }

  const imageUrl = data.src ?? data.imageUrl ?? data.url ?? data.image;
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    draft.images.push({
      src: imageUrl.trim(),
      alt: typeof data.alt === "string" ? data.alt : undefined,
    });
  }

  for (const key of TEXT_PROP_KEYS) {
    const val = data[key];
    if (typeof val !== "string" || !val.trim()) continue;
    const text = val.trim();
    if (/^h[1-6]$/i.test(key) || key === "heading") {
      const level = key === "heading" ? 2 : Number(key.replace(/\D/g, "")) || 2;
      draft.headings.push({ level, text });
    } else if (key.startsWith("title") && !draft.title) {
      draft.title = text;
    } else if (text.length > 80 || key.includes("body") || key.includes("content")) {
      draft.paragraphs.push(text);
    }
  }

  const linkHref = data.href ?? data.url ?? data.link;
  if (typeof linkHref === "string" && linkHref.startsWith("http")) {
    draft.links.external.push(linkHref);
  } else if (typeof linkHref === "string" && linkHref.startsWith("/")) {
    draft.links.internal.push(linkHref);
  }

  if (block.children?.length) {
    for (const child of block.children) extractFromBlock(child, draft);
  }
}

export function extractContentFromBlocks(
  blocks: PageBlocks | unknown,
  fallbackTitle = ""
): ContentSnapshotDraft {
  const draft = emptyDraft(fallbackTitle);
  if (!Array.isArray(blocks)) return draft;

  for (const block of blocks as BlockNode[]) {
    if (block.hidden) continue;
    extractFromBlock(block, draft);
  }

  if (!draft.title && draft.headings.length > 0) {
    draft.title = draft.headings[0]!.text;
  }

  const allText = [...draft.paragraphs, ...draft.headings.map((h) => h.text)].join(" ");
  draft.language = /[\u0600-\u06FF]/.test(allText) ? "ar" : "en";

  return draft;
}

export function mergeAnalyzerDraft(
  base: ContentSnapshotDraft,
  patch: Partial<ContentSnapshotDraft>
): ContentSnapshotDraft {
  return {
    title: patch.title ?? base.title,
    headings: patch.headings ?? base.headings,
    paragraphs: patch.paragraphs ?? base.paragraphs,
    tables: patch.tables ?? base.tables,
    images: patch.images ?? base.images,
    links: patch.links ?? base.links,
    faq: patch.faq ?? base.faq,
    products: patch.products ?? base.products,
    language: patch.language ?? base.language,
  };
}
