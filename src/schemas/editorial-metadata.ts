import { z } from "zod";

export const citationSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const citationSourcesSchema = z.array(citationSourceSchema);

export type CitationSource = z.infer<typeof citationSourceSchema>;

export function parseCitationSources(raw: unknown): CitationSource[] {
  if (!Array.isArray(raw)) return [];
  const result = citationSourcesSchema.safeParse(raw);
  return result.success ? result.data : [];
}

/** Default: show author and publish date when a page/post has not opted out. */
export const DEFAULT_SHOW_AUTHOR = true;
export const DEFAULT_SHOW_PUBLISHED_AT = true;

export function parseShowFlag(raw: unknown, fallback = true): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw == null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "on" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "off" || s === "no") return false;
  return fallback;
}

export function resolveEditorialMetaDisplay(input: {
  author?: string | null;
  publishedAt?: Date | string | null;
  showAuthor?: boolean | null;
  showPublishedAt?: boolean | null;
}): { author: string | null; publishedAt: Date | string | null } {
  return {
    author: (input.showAuthor ?? DEFAULT_SHOW_AUTHOR) ? (input.author ?? null) : null,
    publishedAt: (input.showPublishedAt ?? DEFAULT_SHOW_PUBLISHED_AT)
      ? (input.publishedAt ?? null)
      : null,
  };
}

export function editorialDisplayFromMetadata(metadata: unknown): {
  showAuthor: boolean;
  showPublishedAt: boolean;
} {
  const raw =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  return {
    showAuthor: parseShowFlag(raw.showAuthor),
    showPublishedAt: parseShowFlag(raw.showPublishedAt),
  };
}

export function withEditorialDisplayMetadata<T extends { metadata?: object }>(
  composition: T,
  showAuthor: boolean,
  showPublishedAt: boolean,
): T {
  return {
    ...composition,
    metadata: {
      ...(composition.metadata ?? {}),
      showAuthor,
      showPublishedAt,
    },
  };
}
