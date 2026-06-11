import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  resolveBlockField,
  setInstanceTranslation,
} from "@/features/builder/localization/block-localization";

describe("block localization", () => {
  it("resolves instance-level translations before legacy props", () => {
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
      resolveBlockField(block, "title", "en", { fallbackChain: ["en"] }),
      "Instance EN"
    );
  });

  it("stores per-locale values on instance", () => {
    const loc = setInstanceTranslation(undefined, "title", "fr", "Bonjour");
    assert.equal(loc.translations?.title?.fr, "Bonjour");
  });
});
