import type {
  SeoGenerationProvider,
  SeoSuggestion,
} from "../../../types";
import { buildProvenance } from "../template-engine";

/**
 * AI provider reads Snapshot + Rules + Templates + Knowledge only — never raw blocks.
 * When capabilities/ai implements generateContent(), wire it here.
 */
export const aiGenerationProvider: SeoGenerationProvider = {
  id: "ai",
  async generate(input) {
    const { snapshot, templates, knowledge, current } = input;

    const titleHint =
      templates.find((t) => t.pattern.includes("{Title}"))?.resolved ?? snapshot.title;
    const knowledgeHint = knowledge.entries
      .slice(0, 3)
      .map((e) => e.title)
      .join("; ");

    const metaTitle = current?.metaTitle ?? titleHint.slice(0, 60);
    const metaDescription =
      current?.metaDescription ??
      (snapshot.paragraphs[0]?.slice(0, 160) ||
        `${snapshot.title} — optimized with knowledge: ${knowledgeHint}`);

    const suggestion: SeoSuggestion = Object.freeze({
      metaTitle,
      metaDescription,
      focusKeywords: current?.focusKeywords,
      ogTitle: metaTitle.slice(0, 70),
      ogImageUrl: snapshot.images[0]?.src,
      robots: "index, follow",
      twitterCard: "summary_large_image",
      source: "ai",
      provenance: buildProvenance("ai", [
        { label: "ContentSnapshot", detail: snapshot.id },
        { label: "Templates", detail: String(templates.length) },
        { label: "Knowledge", detail: knowledgeHint || "none" },
        { label: "AI Provider", detail: "rule-assisted stub" },
      ]),
    });

    return suggestion;
  },
};

export const ruleBasedProvider: SeoGenerationProvider = {
  id: "rule-based",
  async generate() {
    throw new Error("rule-based provider is invoked via generateRuleBasedSuggestion");
  },
};
