import type { ContentSnapshot } from "../types";
import { extractOpeningExcerpt } from "../layers/content/page-text";
import { normalizeTopic } from "@/features/search-intelligence/content-intelligence/page-search-target";

export type TopicEvidenceSurface = "title" | "h1" | "opening";

export type TopicMatchResult = {
  surface: TopicEvidenceSurface;
  matched: boolean;
  haystack: string;
  evidence?: string;
};

export type TopicEvidenceReport = {
  primaryTopic: string;
  supportingTopics: string[];
  matches: TopicMatchResult[];
  supportingInOpening: number;
};

/** Locale-aware soft normalize for phrase matching (EN/AR-friendly folding). */
export function normalizeForTopicMatch(value: string, locale?: string): string {
  let next = value.normalize("NFKC").toLowerCase();
  // Arabic tatweel and common diacritics
  next = next.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  if (locale?.toLowerCase().startsWith("ar")) {
    next = next
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  }
  return next.replace(/\s+/g, " ").trim();
}

export function softIncludesPhrase(
  haystack: string,
  phrase: string,
  locale?: string,
): boolean {
  const h = normalizeForTopicMatch(haystack, locale);
  const p = normalizeForTopicMatch(phrase, locale);
  if (!p || !h) return false;
  if (h.includes(p)) return true;
  // Soft: all phrase tokens present (order-independent) for multi-word topics
  const tokens = p.split(" ").filter((t) => t.length >= 3);
  if (tokens.length <= 1) return false;
  return tokens.every((t) => h.includes(t));
}

function evidenceSnippet(haystack: string, phrase: string, locale?: string): string | undefined {
  const h = haystack.trim();
  if (!h) return undefined;
  const p = normalizeForTopicMatch(phrase, locale);
  const lower = normalizeForTopicMatch(h, locale);
  const idx = lower.indexOf(p.split(" ")[0] ?? p);
  if (idx < 0) return h.slice(0, 120);
  const start = Math.max(0, idx - 20);
  return h.slice(start, start + 140);
}

export function evaluateTopicEvidence(input: {
  snapshot: ContentSnapshot;
  primaryTopic: string;
  supportingTopics?: string[];
  locale?: string;
}): TopicEvidenceReport {
  const locale = input.locale ?? input.snapshot.localeCode;
  const primary = input.primaryTopic.trim();
  const supporting = (input.supportingTopics ?? []).map((t) => t.trim()).filter(Boolean);
  const h1 =
    input.snapshot.headings.find((heading) => heading.level === 1)?.text?.trim() ?? "";
  const opening = extractOpeningExcerpt(input.snapshot);

  const surfaces: Array<{ surface: TopicEvidenceSurface; haystack: string }> = [
    { surface: "title", haystack: input.snapshot.title ?? "" },
    { surface: "h1", haystack: h1 },
    { surface: "opening", haystack: opening },
  ];

  const matches: TopicMatchResult[] = surfaces.map(({ surface, haystack }) => {
    const matched = softIncludesPhrase(haystack, primary, locale);
    return {
      surface,
      matched,
      haystack,
      evidence: matched ? evidenceSnippet(haystack, primary, locale) : undefined,
    };
  });

  const supportingInOpening = supporting.filter((topic) =>
    softIncludesPhrase(opening, topic, locale),
  ).length;

  return {
    primaryTopic: primary,
    supportingTopics: supporting,
    matches,
    supportingInOpening,
  };
}

export function topicEvidenceFromSnapshotMetadata(
  snapshot: ContentSnapshot,
): TopicEvidenceReport | null {
  const meta = snapshot.metadata ?? {};
  const primary =
    (typeof meta.primaryTopic === "string" && meta.primaryTopic.trim()) ||
    (typeof meta.pageSearchPrimaryTopic === "string" && meta.pageSearchPrimaryTopic.trim()) ||
    "";
  if (!primary) return null;
  const supporting = Array.isArray(meta.supportingTopics)
    ? meta.supportingTopics.filter((t): t is string => typeof t === "string")
    : [];
  return evaluateTopicEvidence({
    snapshot,
    primaryTopic: primary,
    supportingTopics: supporting,
    locale: snapshot.localeCode,
  });
}

export { normalizeTopic };
