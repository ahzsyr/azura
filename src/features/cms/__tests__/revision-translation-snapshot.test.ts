import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRevisionEditLocale,
  parseRevisionTranslationSnapshot,
} from "@/features/cms/revision-translation-snapshot.shared";

describe("parseRevisionTranslationSnapshot", () => {
  it("keeps well-formed snapshot rows and drops junk", () => {
    const parsed = parseRevisionTranslationSnapshot([
      {
        entityType: "CmsPage",
        entityId: "p1",
        field: "title",
        localeCode: "en",
        value: "Hello",
        status: "PUBLISHED",
      },
      { entityType: "CmsPage" },
      null,
    ]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.value, "Hello");
  });
});

describe("getRevisionEditLocale", () => {
  it("reads meta.locale from Page AST envelope", () => {
    assert.equal(
      getRevisionEditLocale({
        version: 1,
        composition: {},
        meta: { locale: "fr-CA" },
      }),
      "fr-CA",
    );
    assert.equal(getRevisionEditLocale({ blocks: [] }), null);
  });
});
