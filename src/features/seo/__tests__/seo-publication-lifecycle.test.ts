import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickSeoTitleFromRevisionSnapshots,
  type RevisionTranslationSnapshotItem,
} from "@/features/cms/revision-translation-snapshot.shared";

function seoRow(
  value: string,
  localeCode = "en",
): RevisionTranslationSnapshotItem {
  return {
    entityType: "SeoMeta",
    entityId: "seo-1",
    field: "metaTitle",
    localeCode,
    value,
    status: "PUBLISHED",
  };
}

describe("SEO publication lifecycle boundary", () => {
  it("Publish A → Edit B keeps public SEO on A until Publish B; Unpublish hides B", () => {
    const revisionA: RevisionTranslationSnapshotItem[] = [seoRow("Title A")];
    const revisionBWorking: RevisionTranslationSnapshotItem[] = [seoRow("Title B")];

    // After Publish A, public pointer is A
    let published = revisionA;
    let phase = pickSeoTitleFromRevisionSnapshots({
      publishedSnapshot: published,
      workingSnapshot: revisionA,
    });
    assert.equal(phase.publicValue, "Title A");

    // Edit working revision B — public still A
    phase = pickSeoTitleFromRevisionSnapshots({
      publishedSnapshot: published,
      workingSnapshot: revisionBWorking,
    });
    assert.equal(phase.publicValue, "Title A");
    assert.equal(phase.workingValue, "Title B");

    // Publish B — public becomes B
    published = revisionBWorking;
    phase = pickSeoTitleFromRevisionSnapshots({
      publishedSnapshot: published,
      workingSnapshot: revisionBWorking,
    });
    assert.equal(phase.publicValue, "Title B");

    // Unpublish — clear published pointer (no public SEO)
    published = [];
    phase = pickSeoTitleFromRevisionSnapshots({
      publishedSnapshot: published,
      workingSnapshot: revisionBWorking,
    });
    assert.equal(phase.publicValue, null);
    assert.equal(phase.workingValue, "Title B");
  });
});
