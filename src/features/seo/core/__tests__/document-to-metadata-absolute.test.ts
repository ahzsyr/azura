/**
 * documentToMetadata absolute title + safe fallbacks.
 * Run: npx tsx --test src/features/seo/core/__tests__/document-to-metadata-absolute.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentToMetadata } from "../document-to-metadata";
import { resolveRobots } from "../seo-robots";
import type { ResolvedSeoDocument } from "../seo-document";

function sampleDoc(overrides: Partial<ResolvedSeoDocument> = {}): ResolvedSeoDocument {
  return {
    url: "https://brt-me.com/",
    status: 200,
    title: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
    description: "Wireless solutions in Dubai.",
    canonical: "https://brt-me.com/",
    robots: resolveRobots({ status: 200 })!,
    identity: {
      pageType: "static",
      localePrefix: "en",
      languageCode: "en",
      publicPath: "/",
      pageKey: "home",
    },
    indexable: true,
    ...overrides,
  };
}

describe("documentToMetadata absolute titles", () => {
  it("emits title.absolute and never a bare string", () => {
    const metadata = documentToMetadata(sampleDoc());
    assert.ok(metadata.title);
    assert.equal(typeof metadata.title, "object");
    assert.deepEqual(metadata.title, {
      absolute: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
    });
  });

  it("preserves full title without layout double-branding hook", () => {
    const metadata = documentToMetadata(
      sampleDoc({
        title: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
      }),
    );
    assert.deepEqual(metadata.title, {
      absolute: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
    });
  });

  it("uses pageTitle as absolute when title missing", () => {
    const metadata = documentToMetadata(
      sampleDoc({ title: undefined, pageTitle: "About Us" }),
    );
    assert.deepEqual(metadata.title, { absolute: "About Us" });
  });
});
