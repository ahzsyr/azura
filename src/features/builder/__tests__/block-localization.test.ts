import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  resolveBlockField,
  setInstanceTranslation,
} from "@/features/builder/localization/block-localization";

describe("block localization", () => {
  it("resolves EntityTranslation before instance translations and legacy props", () => {
    const block: BlockNode = {
      id: "b1",
      type: "hero",
      version: "2.0",
      props: { titleEn: "Legacy" },
      settings: { titleEn: "Legacy" },
      localization: {
        translations: {
          title: { en: "Instance EN", ar: "Instance AR" },
        },
        fallbackChain: ["en"],
      },
    };
    assert.equal(
      resolveBlockField(block, "title", "en", {
        fallbackChain: ["en"],
        entityTranslations: [
          {
            id: "t1",
            entityType: "BuilderBlock",
            entityId: "b1",
            field: "title",
            localeCode: "en",
            value: "From ET",
            status: "PUBLISHED",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
      "From ET"
    );
  });

  it("falls back to legacy props when EntityTranslation is empty", () => {
    const block: BlockNode = {
      id: "b1",
      type: "hero",
      version: "2.0",
      props: { titleEn: "Legacy" },
      settings: { titleEn: "Legacy" },
    };
    assert.equal(resolveBlockField(block, "title", "en"), "Legacy");
  });

  it("stores per-locale values on instance", () => {
    const loc = setInstanceTranslation(undefined, "title", "fr", "Bonjour");
    assert.equal(loc.translations?.title?.fr, "Bonjour");
  });
});
