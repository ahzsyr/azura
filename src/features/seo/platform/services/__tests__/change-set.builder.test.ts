import { describe, expect, it } from "vitest";
import { changeSetBuilder } from "../change-set.builder";
import type { SeoDiffResult } from "../../types/autofill";
import type { SeoSuggestion } from "../../types";

const descriptor = Object.freeze({
  kind: "product" as const,
  id: "test-product",
  locale: "en",
  routingKey: "product:test-product",
});

const suggestion: SeoSuggestion = Object.freeze({
  metaTitle: "New Title",
  metaDescription: "New description for SEO",
  source: "rule-based",
  provenance: Object.freeze({
    metaTitle: Object.freeze([{ label: "TemplateEngine" }]),
    metaDescription: Object.freeze([{ label: "ContentSnapshot" }]),
  }),
});

const diff: SeoDiffResult = Object.freeze({
  hasChanges: true,
  fields: Object.freeze([
    Object.freeze({
      field: "metaTitle",
      current: "Old Title",
      suggested: "New Title",
      changed: true,
    }),
    Object.freeze({
      field: "metaDescription",
      current: "",
      suggested: "New description for SEO",
      changed: true,
    }),
  ]),
});

describe("changeSetBuilder", () => {
  it("preview mode includes all mergeable fields", () => {
    const cs = changeSetBuilder.build({
      origin: "autofill",
      descriptor,
      locale: "en",
      profileId: "balanced",
      applyMode: "preview",
      suggestion,
      diff,
    });
    expect(cs.fields.length).toBe(2);
    expect(cs.status).toBe("pending");
    expect(cs.origin).toBe("autofill");
  });

  it("fill_empty skips non-empty current values", () => {
    const cs = changeSetBuilder.build({
      origin: "autofill",
      descriptor,
      locale: "en",
      profileId: "conservative",
      applyMode: "fill_empty",
      suggestion,
      diff,
    });
    expect(cs.fields.map((f) => f.field)).toEqual(["metaDescription"]);
  });

  it("overwrite_all includes all suggested fields", () => {
    const cs = changeSetBuilder.build({
      origin: "autofill",
      descriptor,
      locale: "en",
      profileId: "aggressive",
      applyMode: "overwrite_all",
      suggestion,
      diff,
    });
    expect(cs.fields.length).toBe(2);
  });

  it("profile and applyMode are independent", () => {
    const aggressivePreview = changeSetBuilder.build({
      origin: "autofill",
      descriptor,
      locale: "en",
      profileId: "aggressive",
      applyMode: "preview",
      suggestion,
      diff,
    });
    const conservativeOverwrite = changeSetBuilder.build({
      origin: "autofill",
      descriptor,
      locale: "en",
      profileId: "conservative",
      applyMode: "overwrite_all",
      suggestion,
      diff,
    });
    expect(aggressivePreview.profileId).toBe("aggressive");
    expect(conservativeOverwrite.profileId).toBe("conservative");
    expect(aggressivePreview.applyMode).toBe("preview");
    expect(conservativeOverwrite.applyMode).toBe("overwrite_all");
  });
});
