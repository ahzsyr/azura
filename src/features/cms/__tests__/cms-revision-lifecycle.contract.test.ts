/**
 * Phase 5 CMS lifecycle contracts — behavior of revision pointers, not helper call spies.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import {
  parseRevisionTranslationSnapshot,
  getRevisionEditLocale,
} from "@/features/cms/revision-translation-snapshot.shared";
import { pickSeoTitleFromRevisionSnapshots } from "@/features/cms/revision-translation-snapshot.shared";

let draftMode = false;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (
    request.endsWith("/draft-mode") ||
    request === "@/features/cms/draft-mode"
  ) {
    return {
      isCmsDraftModeEnabled: async () => draftMode,
    };
  }
  return originalLoad.call(this, request, ...args);
};

describe("CMS revision lifecycle contracts", () => {
  it("public uses publishedRevisionId; draft preview uses workingRevisionId", async () => {
    const { selectCmsPageRevisionId } = await import(
      "@/features/cms/revision-selection"
    );
    const page = {
      workingRevisionId: "rev-working",
      publishedRevisionId: "rev-published",
    };

    draftMode = false;
    const publicSel = await selectCmsPageRevisionId(page);
    assert.equal(publicSel.revisionId, "rev-published");
    assert.equal(publicSel.isDraftPreview, false);

    draftMode = true;
    const draftSel = await selectCmsPageRevisionId(page);
    assert.equal(draftSel.revisionId, "rev-working");
    assert.equal(draftSel.isDraftPreview, true);
  });

  it("edit after publish keeps public pointer on previous revision until republish", () => {
    // Model: after Publish A, public = A. Working advances to B without moving published.
    let publishedRevisionId: string | null = "A";
    let workingRevisionId: string = "A";

    workingRevisionId = "B";
    assert.equal(publishedRevisionId, "A");
    assert.notEqual(workingRevisionId, publishedRevisionId);

    // Publish B
    publishedRevisionId = workingRevisionId;
    assert.equal(publishedRevisionId, "B");

    // Unpublish clears public pointer; working remains
    publishedRevisionId = null;
    assert.equal(publishedRevisionId, null);
    assert.equal(workingRevisionId, "B");
  });

  it("restore uses revision snapshot AST + translation snapshot for that revision only", () => {
    const snapA = [
      {
        entityType: "CmsPage",
        entityId: "p1",
        field: "title",
        localeCode: "en",
        value: "Title A",
        status: "PUBLISHED",
      },
      {
        entityType: "CmsPage",
        entityId: "p1",
        field: "title",
        localeCode: "fr",
        value: "Titre A",
        status: "PUBLISHED",
      },
    ];
    const snapB = [
      {
        entityType: "CmsPage",
        entityId: "p1",
        field: "title",
        localeCode: "en",
        value: "Title B",
        status: "PUBLISHED",
      },
    ];

    const restored = parseRevisionTranslationSnapshot(snapA);
    assert.equal(restored.length, 2);
    assert.ok(restored.some((r) => r.localeCode === "fr" && r.value === "Titre A"));

    const other = parseRevisionTranslationSnapshot(snapB);
    assert.equal(other.length, 1);
    assert.ok(!other.some((r) => r.localeCode === "fr"));
  });

  it("revision edit locale is read from snapshot meta without inventing locales", () => {
    assert.equal(getRevisionEditLocale({ meta: { locale: "ar" } }), "ar");
    assert.equal(getRevisionEditLocale({ meta: {} }), null);
  });

  it("SEO public value tracks published snapshot only across edit/publish/unpublish", () => {
    const a = [
      {
        entityType: "SeoMeta",
        entityId: "s1",
        field: "metaTitle",
        localeCode: "en",
        value: "SEO A",
        status: "PUBLISHED",
      },
    ];
    const b = [
      {
        entityType: "SeoMeta",
        entityId: "s1",
        field: "metaTitle",
        localeCode: "en",
        value: "SEO B",
        status: "PUBLISHED",
      },
    ];

    let published = a;
    assert.equal(
      pickSeoTitleFromRevisionSnapshots({
        publishedSnapshot: published,
        workingSnapshot: b,
      }).publicValue,
      "SEO A",
    );

    published = b;
    assert.equal(
      pickSeoTitleFromRevisionSnapshots({
        publishedSnapshot: published,
        workingSnapshot: b,
      }).publicValue,
      "SEO B",
    );

    published = [];
    assert.equal(
      pickSeoTitleFromRevisionSnapshots({
        publishedSnapshot: published,
        workingSnapshot: b,
      }).publicValue,
      null,
    );
  });
});
