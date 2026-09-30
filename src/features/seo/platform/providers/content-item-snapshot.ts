import type { EntityTranslation } from "@prisma/client";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { PageBlocks } from "@/types/builder";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import { extractContentFromBlocks } from "../layers/content/block-extractor";
import { emptyDraft } from "../layers/content/snapshot-builder";
import type { ContentSnapshotDraft } from "../types";

function pickLocale(record: Record<string, string>, locale: string): string {
  return (record[locale] ?? record.en ?? "").trim();
}

/** Cover priority matches public content-item page renderer. */
export function resolveContentItemCoverImageUrl(row: {
  featuredImageUrl?: string | null;
  media?: Array<{ url: string; isCover?: boolean }>;
}): string | undefined {
  const media = row.media ?? [];
  const cover = media.find((m) => m.isCover)?.url?.trim();
  if (cover) return normalizeRemoteImageUrl(cover) ?? cover;
  const featured = row.featuredImageUrl?.trim();
  if (featured) return normalizeRemoteImageUrl(featured) ?? featured;
  const first = media[0]?.url?.trim();
  if (first) return normalizeRemoteImageUrl(first) ?? first;
  return undefined;
}

export function resolveContentItemTitle(
  translations: EntityTranslation[],
  locale: string
): string {
  const seoTitle = toLocalizedRecord(translations, "seoTitle");
  const title = toLocalizedRecord(translations, "title");
  return pickLocale(seoTitle, locale) || pickLocale(title, locale);
}

export function resolveContentItemDescription(
  translations: EntityTranslation[],
  locale: string
): string {
  const seoDescription = toLocalizedRecord(translations, "seoDescription");
  const shortDescription = toLocalizedRecord(translations, "shortDescription");
  const description = toLocalizedRecord(translations, "description");
  return (
    pickLocale(seoDescription, locale) ||
    pickLocale(shortDescription, locale) ||
    pickLocale(description, locale).slice(0, 160)
  );
}

/** Assembles a snapshot draft from already-loaded content item fields (testable without Prisma). */
export function assembleContentItemDraft(input: {
  locale: string;
  title: string;
  description: string;
  blocks: PageBlocks | null;
  featuredImageUrl?: string | null;
  media?: Array<{ url: string; isCover?: boolean }>;
}): ContentSnapshotDraft {
  const fallbackTitle = input.title.trim();
  let draft = input.blocks
    ? extractContentFromBlocks(input.blocks, fallbackTitle)
    : emptyDraft(fallbackTitle);
  if (!draft.title) draft.title = fallbackTitle;

  const desc = input.description.trim();
  if (desc && !draft.paragraphs.length) {
    draft = { ...draft, paragraphs: [desc] };
  } else if (desc && !draft.paragraphs.includes(desc)) {
    draft = { ...draft, paragraphs: [desc, ...draft.paragraphs] };
  }

  const featuredImage = resolveContentItemCoverImageUrl({
    featuredImageUrl: input.featuredImageUrl,
    media: input.media,
  });
  if (featuredImage) {
    const hasFeatured = draft.images.some((img) => img.src === featuredImage);
    if (!hasFeatured) {
      draft = {
        ...draft,
        images: [{ src: featuredImage, alt: fallbackTitle }, ...draft.images],
      };
    }
    draft = {
      ...draft,
      metadata: {
        ...(draft.metadata ?? {}),
        featuredImage,
      },
    };
  }

  return draft;
}
