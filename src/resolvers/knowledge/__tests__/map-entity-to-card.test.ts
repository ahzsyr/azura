import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityRecord } from "@/features/entities/types";
import {
  mapKnowledgeEntityToCardViewModel,
  mapKnowledgeEntityToDetailViewModel,
  resolveKnowledgeArticleHref,
} from "@/resolvers/knowledge/map-entity-to-card";
import {
  isKnowledgePresetId,
  resolveKnowledgeArticleCardTemplateId,
  resolveKnowledgeArticleDetailTemplateId,
} from "@/templates/preset-template-map";
import { knowledgeBasePropsSchema } from "@/features/builder/blocks/portal/schemas/portal-blocks";
import {
  getEntityConfigForPreset,
  getEntityTypesForPreset,
} from "@/features/translation/entity-registry";

const knowledgeEntity: EntityRecord = {
  ref: { presetId: "knowledge", storage: "portal", id: "art-1", slug: "getting-started" },
  title: "Getting Started",
  excerpt: "Quick intro",
  collectionSlug: "basics",
  fields: {
    knowledgeBaseSlug: "help",
    body: "<p>Welcome</p>",
    ratingSum: 18,
    ratingCount: 4,
    categorySlug: "basics",
  },
};

const baseCtx = { locale: "en", localePrefix: "en" };

describe("knowledge preset-template-map", () => {
  it("identifies knowledge preset", () => {
    assert.equal(isKnowledgePresetId("knowledge"), true);
    assert.equal(isKnowledgePresetId("product"), false);
  });

  it("resolves knowledge template ids", () => {
    assert.equal(resolveKnowledgeArticleCardTemplateId(), "knowledge-article-card");
    assert.equal(resolveKnowledgeArticleDetailTemplateId(), "knowledge-article-detail");
  });
});

describe("mapKnowledgeEntityToCardViewModel", () => {
  it("builds knowledge article card view model", () => {
    const vm = mapKnowledgeEntityToCardViewModel(
      { entity: knowledgeEntity, knowledgeBaseSlug: "help" },
      baseCtx,
    );
    assert.equal(vm.templateId, "knowledge-article-card");
    assert.equal(vm.presetId, "knowledge");
    assert.equal(vm.slug, "getting-started");
    assert.equal(vm.knowledgeBaseSlug, "help");
    assert.equal(vm.ratingAverage, 4.5);
    assert.equal(vm.ratingCount, 4);
    assert.equal(vm.href, "/en/help/help/getting-started");
  });

  it("builds knowledge article detail view model", () => {
    const vm = mapKnowledgeEntityToDetailViewModel(
      { entity: knowledgeEntity, knowledgeBaseSlug: "help" },
      baseCtx,
    );
    assert.equal(vm.templateId, "knowledge-article-detail");
    assert.equal(vm.body, "<p>Welcome</p>");
  });
});

describe("resolveKnowledgeArticleHref", () => {
  it("builds locale-prefixed help path", () => {
    assert.equal(
      resolveKnowledgeArticleHref({
        knowledgeBaseSlug: "support",
        articleSlug: "faq",
        localePrefix: "ar",
      }),
      "/ar/help/support/faq",
    );
  });
});

describe("knowledgeBasePropsSchema", () => {
  it("defaults presetId to knowledge", () => {
    const parsed = knowledgeBasePropsSchema.parse({});
    assert.equal(parsed.presetId, "knowledge");
    assert.equal(parsed.knowledgeBaseSlug, "");
  });

  it("accepts explicit templateId", () => {
    const parsed = knowledgeBasePropsSchema.parse({
      templateId: "knowledge-article-card",
      knowledgeBaseSlug: "help",
    });
    assert.equal(parsed.templateId, "knowledge-article-card");
    assert.equal(parsed.knowledgeBaseSlug, "help");
  });
});

describe("translation preset aliases", () => {
  it("maps knowledge preset to legacy entity types", () => {
    const types = getEntityTypesForPreset("knowledge");
    assert.deepEqual(types, ["KnowledgeArticle", "KnowledgeCategory", "KnowledgeBase"]);
    const configs = getEntityConfigForPreset("knowledge");
    assert.equal(configs.length, 3);
    assert.ok(configs.some((c) => c.label === "Knowledge Article"));
  });
});
