import type {
  SeoLlmsConfig,
  SeoLlmsLink,
  SeoLlmsSection,
} from "../types";
import {
  isPrivatePublicPath,
  STATIC_SEO_PAGES,
} from "../constants";
import {
  classifySitemapUrl,
  isSitemapIndexableUrl,
  type SitemapType,
} from "../sitemap-url-classify";

export const LLMS_MAX_DOCUMENT_BYTES = 512_000;
export const LLMS_MAX_SECTIONS = 50;
export const LLMS_MAX_LINKS = 500;
export const LLMS_DEFAULT_MAX_LINKS_PER_SECTION = 100;

export type LlmsDraftEntry = {
  url: string;
  lastModified?: Date | string;
};

export type LlmsDraftOptions = {
  origin: string | null;
  defaultPrefix: string;
  localePrefixes: string[];
  siteName: string;
  tagline?: string;
  /** Additional paths/URLs excluded from the generated draft. */
  excludePaths?: string[];
  /** Paths already marked noindex (defense in depth when entries are supplied directly). */
  noIndexPaths?: string[];
  maxLinksPerSection?: number;
  generatedAt?: Date;
};

export type LlmsDraftResult = {
  document: SeoLlmsConfig;
  stats: LlmsDocumentStats;
  warnings: string[];
};

export type LlmsDocumentStats = {
  sections: number;
  links: number;
  bytes: number;
};

export type LlmsValidationOptions = {
  /** Preferred public origin; enables same-origin safety checks. */
  siteOrigin?: string | null;
};

export type LlmsValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

let idCounter = 0;

function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `${prefix}-${random.slice(0, 8)}`;
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function normalizeText(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

function normalizeLink(raw: unknown, index: number): SeoLlmsLink | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = normalizeText(record.title, 200);
  const url = normalizeText(record.url, 2048);
  if (!title && !url) return null;
  const id = normalizeText(record.id, 100) || `link-${index + 1}`;
  const description = normalizeText(record.description, 300);
  return {
    id,
    title,
    url,
    ...(description ? { description } : {}),
  };
}

function normalizeSection(raw: unknown, index: number): SeoLlmsSection | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const heading = normalizeText(record.heading, 120);
  if (!heading) return null;
  const rawLinks = Array.isArray(record.links) ? record.links : [];
  const links = rawLinks
    .map((link, linkIndex) => normalizeLink(link, linkIndex))
    .filter((link): link is SeoLlmsLink => Boolean(link));
  const body = normalizeText(record.body, 2000);
  return {
    id: normalizeText(record.id, 100) || `section-${index + 1}`,
    heading,
    ...(body ? { body } : {}),
    links,
  };
}

/**
 * Defensive normalization for JsonStore data and admin form input.
 * Missing ids are generated deterministically; unknown fields are dropped.
 */
export function normalizeLlmsDocument(raw: unknown): SeoLlmsConfig {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title = normalizeText(record.title, 200);
  const summary = normalizeText(record.summary, 500);
  const details = normalizeText(record.details, 5000);
  const rawSections = Array.isArray(record.sections) ? record.sections : [];
  const sections = rawSections
    .map((section, index) => normalizeSection(section, index))
    .filter((section): section is SeoLlmsSection => Boolean(section));
  const generatedFrom =
    record.generatedFrom && typeof record.generatedFrom === "object"
      ? (record.generatedFrom as Record<string, unknown>)
      : null;
  const updatedAt = normalizeText(record.updatedAt, 64);

  return {
    version: 1,
    enabled: record.enabled !== false,
    title,
    ...(summary ? { summary } : {}),
    ...(details ? { details } : {}),
    sections,
    ...(updatedAt ? { updatedAt } : {}),
    ...(generatedFrom
      ? {
          generatedFrom: {
            ...(normalizeText(generatedFrom.origin, 300)
              ? { origin: normalizeText(generatedFrom.origin, 300) }
              : {}),
            ...(normalizeText(generatedFrom.generatedAt, 64)
              ? { generatedAt: normalizeText(generatedFrom.generatedAt, 64) }
              : {}),
            ...(typeof generatedFrom.entryCount === "number"
              ? { entryCount: generatedFrom.entryCount }
              : {}),
          },
        }
      : {}),
  };
}

export function createEmptyLlmsDocument(input?: {
  title?: string;
  summary?: string;
  details?: string;
  enabled?: boolean;
}): SeoLlmsConfig {
  return {
    version: 1,
    enabled: input?.enabled ?? true,
    title: input?.title?.trim() ?? "",
    ...(input?.summary?.trim() ? { summary: input.summary.trim() } : {}),
    ...(input?.details?.trim() ? { details: input.details.trim() } : {}),
    sections: [],
  };
}

function escapeMarkdownText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function formatLlmsLink(link: SeoLlmsLink): string {
  const title = escapeMarkdownText(singleLine(link.title)) || singleLine(link.url);
  const description = singleLine(link.description ?? "");
  return `- [${title}](${singleLine(link.url)})${description ? `: ${description}` : ""}`;
}

/**
 * Render the canonical llms.txt markdown representation.
 * This function is the single formatter used by preview, save validation, and
 * the public route, so what admins preview is exactly what is served.
 */
export function formatLlmsTxt(input: SeoLlmsConfig): string {
  const doc = normalizeLlmsDocument(input);
  const title = doc.title || "Site";
  const blocks: string[] = [`# ${singleLine(title)}`];

  if (doc.summary?.trim()) {
    const summary = doc.summary
      .split("\n")
      .map((line) => `> ${line.trim()}`.trimEnd())
      .join("\n");
    blocks.push(summary);
  }

  if (doc.details?.trim()) {
    blocks.push(doc.details.trim());
  }

  for (const section of doc.sections) {
    const lines = [`## ${section.heading.trim()}`];
    if (section.body?.trim()) lines.push("", section.body.trim());
    const links = section.links.filter((link) => link.title.trim() || link.url.trim());
    if (links.length > 0) {
      lines.push("", ...links.map((link) => formatLlmsLink(link)));
    }
    blocks.push(lines.join("\n"));
  }

  return `${blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function parseLinkLine(line: string): { link: SeoLlmsLink | null; malformed: boolean } {
  const trimmed = line.trim();
  if (!trimmed.startsWith("- ") && !trimmed.startsWith("* ")) {
    return { link: null, malformed: false };
  }
  const body = trimmed.slice(2).trim();
  if (!body.startsWith("[")) {
    return { link: null, malformed: false };
  }
  const match = body.match(/^\[([^\]]+)\]\(([^)\s]+)\)(?:\s*[:\u2014-]\s*(.*))?$/);
  if (!match) return { link: null, malformed: true };
  const title = match[1]?.trim() ?? "";
  const url = match[2]?.trim() ?? "";
  if (!title || !url) return { link: null, malformed: true };
  const description = match[3]?.trim();
  return {
    link: {
      id: newId("link"),
      title,
      url,
      ...(description ? { description } : {}),
    },
    malformed: false,
  };
}

/**
 * Parse raw markdown edited by an admin back into the structured document.
 * Malformed link-looking lines are reported instead of silently becoming body
 * text, so raw mode cannot corrupt entries.
 */
export function parseLlmsTxt(
  text: string,
): { document: SeoLlmsConfig; errors: string[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const errors: string[] = [];

  let title = "";
  let contentStart = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      contentStart = lineIndex + 1;
    } else {
      contentStart = lineIndex;
    }
    break;
  }

  if (!title) errors.push("Missing H1 title (`# Title`).");

  const summaryLines: string[] = [];
  const detailLines: string[] = [];
  const sections: SeoLlmsSection[] = [];
  let currentSection: SeoLlmsSection | null = null;
  let inSummary = false;
  let sawSection = false;

  for (let lineIndex = contentStart; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex]!;
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      sawSection = true;
      const heading = line.slice(3).trim();
      if (!heading) errors.push(`Section ${sections.length + 1} is missing a heading.`);
      currentSection = {
        id: newId("section"),
        heading: heading || `Section ${sections.length + 1}`,
        links: [],
      };
      sections.push(currentSection);
      inSummary = false;
      continue;
    }

    if (!sawSection) {
      if (line.startsWith(">")) {
        inSummary = true;
        summaryLines.push(line.replace(/^>\s?/, "").trim());
        continue;
      }
      if (line) {
        inSummary = false;
        detailLines.push(rawLine.trimEnd());
      } else if (!inSummary && detailLines.length > 0) {
        detailLines.push("");
      }
      continue;
    }

    const parsedLink = parseLinkLine(rawLine);
    if (parsedLink.malformed) {
      errors.push(
        `Malformed link on line ${lineIndex + 1}: expected "- [Title](https://example.com)".`,
      );
      continue;
    }
    if (parsedLink.link) {
      currentSection!.links.push(parsedLink.link);
      continue;
    }
    if (line) {
      currentSection!.body = currentSection!.body
        ? `${currentSection!.body}\n${rawLine.trimEnd()}`
        : rawLine.trimEnd();
    }
  }

  while (detailLines.length > 0 && !detailLines[detailLines.length - 1]?.trim()) {
    detailLines.pop();
  }

  return {
    document: {
      version: 1,
      enabled: true,
      title,
      ...(summaryLines.length ? { summary: summaryLines.join("\n") } : {}),
      ...(detailLines.some((line) => line.trim())
        ? { details: detailLines.join("\n").trim() }
        : {}),
      sections,
    },
    errors,
  };
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isUnsafeUrlForLlms(url: string): boolean {
  if (!isAbsoluteHttpUrl(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return true;
    // Never advertise admin, API, account, or other private surfaces.
    return isPrivatePublicPath(parsed.pathname);
  } catch {
    return true;
  }
}

export function validateLlmsDocument(
  input: SeoLlmsConfig,
  options?: LlmsValidationOptions,
): LlmsValidationResult {
  const doc = normalizeLlmsDocument(input);
  const errors: string[] = [];
  const warnings: string[] = [];
  const siteOrigin = options?.siteOrigin?.replace(/\/$/, "") ?? null;

  if (!doc.title.trim()) errors.push("Title is required.");
  if (doc.title.length > 200) errors.push("Title must be 200 characters or fewer.");
  if ((doc.summary ?? "").length > 500) {
    errors.push("Summary must be 500 characters or fewer.");
  }
  if ((doc.details ?? "").length > 5000) {
    errors.push("Details must be 5000 characters or fewer.");
  }
  if (doc.sections.length > LLMS_MAX_SECTIONS) {
    errors.push(`Use ${LLMS_MAX_SECTIONS} sections or fewer.`);
  }
  if (doc.sections.length === 0) {
    warnings.push("The file has no H2 sections or links yet.");
  }

  const seenUrls = new Set<string>();
  let linkCount = 0;

  for (const [sectionIndex, section] of doc.sections.entries()) {
    if (!section.heading.trim()) {
      errors.push(`Section ${sectionIndex + 1} needs a heading.`);
    }
    if (section.heading.length > 120) {
      errors.push(`Section “${section.heading.slice(0, 40)}…” heading is too long.`);
    }
    if ((section.body ?? "").length > 2000) {
      errors.push(`Section “${section.heading}” body is too long.`);
    }
    for (const [linkIndex, link] of section.links.entries()) {
      linkCount += 1;
      const label = `Section “${section.heading}” link ${linkIndex + 1}`;
      if (!link.title.trim()) errors.push(`${label} needs a title.`);
      if (link.title.length > 200) errors.push(`${label} title is too long.`);
      if (!link.url.trim()) {
        errors.push(`${label} needs a URL.`);
        continue;
      }
      if (!isAbsoluteHttpUrl(link.url)) {
        errors.push(`${label} must use an absolute http(s) URL.`);
        continue;
      }
      if (isUnsafeUrlForLlms(link.url)) {
        errors.push(`${label} points to a private or unsupported URL.`);
        continue;
      }
      const normalized = link.url.replace(/\/$/, "");
      if (seenUrls.has(normalized)) {
        warnings.push(`Duplicate URL: ${link.url}`);
      }
      seenUrls.add(normalized);

      // Advisory only: other hosts are allowed (docs, social), but flag drift.
      if (siteOrigin) {
        let onSite = false;
        try {
          onSite = new URL(link.url).origin === new URL(siteOrigin).origin;
        } catch {
          onSite = false;
        }
        if (!onSite) warnings.push(`External URL not on ${siteOrigin}: ${link.url}`);
      }
    }
  }

  if (linkCount > LLMS_MAX_LINKS) {
    errors.push(`Use ${LLMS_MAX_LINKS} links or fewer.`);
  }

  const rendered = formatLlmsTxt(doc);
  if (utf8ByteLength(rendered) > LLMS_MAX_DOCUMENT_BYTES) {
    errors.push("llms.txt is larger than 500 KB.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Remove links that must never be public. Called by the serving path as a
 * last line of defense even if the stored JSON was edited outside the admin UI.
 */
export function sanitizeLlmsDocumentForPublic(
  input: SeoLlmsConfig,
): { document: SeoLlmsConfig; removedLinks: number } {
  const doc = normalizeLlmsDocument(input);
  let removedLinks = 0;
  const sections = doc.sections.map((section) => ({
    ...section,
    links: section.links.filter((link) => {
      if (!link.url.trim()) return false;
      if (isUnsafeUrlForLlms(link.url)) {
        removedLinks += 1;
        return false;
      }
      return true;
    }),
  }));

  return {
    document: { ...doc, sections },
    removedLinks,
  };
}

export function countLlmsDocument(input: SeoLlmsConfig): LlmsDocumentStats {
  const doc = normalizeLlmsDocument(input);
  return {
    sections: doc.sections.length,
    links: doc.sections.reduce((sum, section) => sum + section.links.length, 0),
    bytes: utf8ByteLength(formatLlmsTxt(doc)),
  };
}

const SECTION_HEADINGS: Record<SitemapType, string> = {
  page: "Pages",
  product: "Products",
  post: "Articles",
  category: "Categories",
  brand: "Brands",
  video: "Videos",
};

const SECTION_ORDER: SitemapType[] = ["page", "product", "category", "brand", "post", "video"];

function titleFromPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  if (!trimmed) return "Home";
  const last = trimmed.split("/").filter(Boolean).pop() ?? "";
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    // keep raw segment
  }
  const words = decoded.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Home";
  return words
    .split(" ")
    .map((word) => (word.length <= 3 ? word.toUpperCase() : `${word[0]!.toUpperCase()}${word.slice(1)}`))
    .join(" ");
}

function staticPageTitle(pathname: string): string | undefined {
  const normalized = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return STATIC_SEO_PAGES.find((page) => page.path === normalized)?.label;
}

/**
 * Build a useful first draft from sitemap entries.
 *
 * The caller is expected to pass entries produced by `generateSitemap()` so
 * publication status, noindex, sitemap exclusions, localized slugs, and the
 * public origin are already applied. The extra `excludePaths`/`noIndexPaths`
 * filters make the function safe and testable in isolation.
 */
export function buildLlmsDraftFromEntries(
  entries: LlmsDraftEntry[],
  options: LlmsDraftOptions,
): LlmsDraftResult {
  const warnings: string[] = [];
  const origin = options.origin?.replace(/\/$/, "") ?? null;
  const siteName = options.siteName.trim() || "Website";
  const summary =
    options.tagline?.trim() || `Canonical public pages and resources from ${siteName}.`;

  if (!origin) {
    warnings.push(
      "A public site origin could not be resolved. Draft links were omitted so no relative URLs are generated.",
    );
    const document = createEmptyLlmsDocument({
      title: siteName,
      summary,
      details: "Site origin unavailable — add canonical links manually or retry when the site URL is configured.",
    });
    return { document, stats: countLlmsDocument(document), warnings };
  }

  if (!isAbsoluteHttpUrl(origin)) {
    warnings.push("The resolved site origin is not an absolute http(s) URL; draft links were omitted.");
    const document = createEmptyLlmsDocument({ title: siteName, summary });
    return { document, stats: countLlmsDocument(document), warnings };
  }

  const excluded = new Set(
    [...(options.excludePaths ?? []), ...(options.noIndexPaths ?? [])]
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => (value.startsWith("/") ? value.replace(/\/$/, "") || "/" : value)),
  );
  const localePrefixes = new Set(options.localePrefixes.filter(Boolean));
  const maxPerSection = Math.max(
    1,
    options.maxLinksPerSection ?? LLMS_DEFAULT_MAX_LINKS_PER_SECTION,
  );
  const generatedAt = options.generatedAt ?? new Date();

  const buckets = new Map<SitemapType, SeoLlmsLink[]>();
  const seen = new Set<string>();
  let skippedNonCanonicalLocale = 0;
  let skippedExcluded = 0;
  let truncated = false;

  for (const entry of entries) {
    if (!entry.url || !isSitemapIndexableUrl(entry.url)) continue;
    let parsed: URL;
    try {
      parsed = new URL(entry.url);
    } catch {
      continue;
    }
    if (parsed.origin !== origin) continue;

    const pathname = parsed.pathname || "/";
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    if (excluded.has(normalizedPath) || excluded.has(pathname)) {
      skippedExcluded += 1;
      continue;
    }

    const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
    if (firstSegment && localePrefixes.has(firstSegment)) {
      // Only the default locale is advertised; non-default variants use /{locale}.
      skippedNonCanonicalLocale += 1;
      continue;
    }

    const canonicalUrl = pathname === "/" ? `${origin}/` : `${origin}${pathname}`;
    if (seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);

    const type = classifySitemapUrl(canonicalUrl);
    const links = buckets.get(type) ?? [];
    if (links.length >= maxPerSection) {
      truncated = true;
      continue;
    }
    const pageLabel = type === "page" ? staticPageTitle(pathname) : undefined;
    links.push({
      id: newId("link"),
      title: pageLabel ?? titleFromPath(pathname),
      url: canonicalUrl,
    });
    buckets.set(type, links);
  }

  if (skippedNonCanonicalLocale > 0) {
    warnings.push(
      `Skipped ${skippedNonCanonicalLocale} locale-prefixed URL(s); the default locale (${options.defaultPrefix}) uses unprefixed canonical URLs.`,
    );
  }
  if (skippedExcluded > 0) {
    warnings.push(`Skipped ${skippedExcluded} excluded or noindex URL(s).`);
  }

  const totalLinks = [...buckets.values()].reduce((sum, links) => sum + links.length, 0);
  if (totalLinks === 0) {
    warnings.push("No published, indexable URLs were found. Add links manually or publish content first.");
  } else if (truncated) {
    warnings.push(
      `Draft capped at ${maxPerSection} links per section. Add missing entries manually.`,
    );
  }

  const sections: SeoLlmsSection[] = SECTION_ORDER.flatMap((type) => {
    const links = buckets.get(type) ?? [];
    if (links.length === 0) return [];
    return [
      {
        id: newId("section"),
        heading: SECTION_HEADINGS[type],
        links,
      },
    ];
  });

  const document: SeoLlmsConfig = {
    version: 1,
    enabled: true,
    title: siteName,
    summary,
    sections,
    generatedFrom: {
      origin,
      generatedAt: generatedAt.toISOString(),
      entryCount: totalLinks,
    },
  };

  return { document, stats: countLlmsDocument(document), warnings };
}

/** Minimal, always-safe document used when DB/content resolution fails. */
export function buildEmergencyLlmsTxt(siteName: string, tagline?: string): string {
  return formatLlmsTxt(
    createEmptyLlmsDocument({
      title: siteName.trim() || "Website",
      summary: tagline?.trim() || "Public site information.",
    }),
  );
}
