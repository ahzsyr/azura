import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRobots, robotsDirectiveToContentString } from "@/features/seo/core/seo-robots";
import { resolveCanonical } from "@/features/seo/core/seo-canonical";
import { resolveOpenGraphType, resolveTwitter } from "@/features/seo/core/seo-social";
import { serializeYoastJson } from "@/features/seo/integrations/yoast/yoast-json.serializer";
import { serializeYoastHtml } from "@/features/seo/integrations/yoast/yoast-html.serializer";
import { serializeYoastHead } from "@/features/seo/integrations/yoast/yoast-head.serializer";
import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";

describe("resolveRobots", () => {
  it("defaults to index follow with snippet directives", () => {
    const robots = resolveRobots({ status: 200 });
    assert.equal(robots?.index, "index");
    assert.equal(robots?.follow, "follow");
    assert.equal(robots?.maxSnippet, "max-snippet:-1");
  });

  it("noindex wins over index", () => {
    const robots = resolveRobots({
      status: 200,
      visibility: "index, follow",
      pageControls: "noindex, follow",
    });
    assert.equal(robots?.index, "noindex");
  });

  it("none wins over nofollow and noindex", () => {
    const robots = resolveRobots({
      status: 200,
      pageControls: "none",
    });
    assert.equal(robots?.index, "noindex");
    assert.equal(robots?.follow, "nofollow");
  });

  it("returns null on error statuses", () => {
    assert.equal(resolveRobots({ status: 404 }), null);
    assert.equal(resolveRobots({ status: 500 }), null);
  });
});

describe("resolveCanonical", () => {
  it("omits canonical when noindex", () => {
    const robots = resolveRobots({ status: 200, pageControls: "noindex, follow" });
    assert.equal(
      resolveCanonical({
        status: 200,
        robots,
        defaultCanonical: "https://example.com/page",
      }),
      undefined,
    );
  });

  it("uses stored canonical when indexable", () => {
    const robots = resolveRobots({ status: 200 });
    assert.equal(
      resolveCanonical({
        status: 200,
        robots,
        storedCanonical: "https://other.com/page",
        defaultCanonical: "https://example.com/page",
      }),
      "https://other.com/page",
    );
  });
});

describe("resolveOpenGraphType", () => {
  it("maps homepage to website", () => {
    assert.equal(resolveOpenGraphType({ pageType: "static", pageKey: "home", status: 200 }), "website");
  });

  it("maps product to article for Yoast parity", () => {
    assert.equal(resolveOpenGraphType({ pageType: "product", status: 200 }), "article");
  });
});

describe("resolveTwitter", () => {
  it("omits title when same as OG", () => {
    const tw = resolveTwitter({
      card: "summary_large_image",
      ogTitle: "Page | Site",
      seoTitle: "Page | Site",
      seoDescription: "Desc",
    });
    assert.equal(tw?.title, undefined);
  });

  it("emits title when different from OG", () => {
    const tw = resolveTwitter({
      card: "summary_large_image",
      twitterTitle: "Custom",
      ogTitle: "Page | Site",
      seoTitle: "Page | Site",
      seoDescription: "Desc",
    });
    assert.equal(tw?.title, "Custom");
  });
});

function sampleDocument(): ResolvedSeoDocument {
  const robots = resolveRobots({ status: 200 })!;
  return {
    url: "https://example.com/en/about",
    status: 200,
    title: "About | Example",
    pageTitle: "About",
    description: "About us",
    canonical: "https://example.com/about",
    robots,
    openGraph: {
      locale: "en_US",
      type: "article",
      title: "About | Example",
      description: "About us",
      url: "https://example.com/about",
      siteName: "Example",
      images: [{ url: "https://example.com/og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", site: "@example" },
    schema: {
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebPage", name: "About" }],
    },
    identity: {
      pageType: "static",
      pageKey: "about",
      localePrefix: "en",
      languageCode: "en",
      publicPath: "/about",
    },
    indexable: true,
  };
}

describe("Yoast serializers", () => {
  it("json and html derive from the same document", () => {
    const doc = sampleDocument();
    const head = serializeYoastHead(doc);
    const json = serializeYoastJson(doc);
    const html = serializeYoastHtml(doc);

    assert.equal(head.status, 200);
    assert.equal(head.json.title, doc.title);
    assert.equal(json.og_title, doc.openGraph?.title);
    assert.match(html, /<title>About \| Example<\/title>/);
    assert.match(html, /application\/ld\+json/);
    assert.deepEqual(head.json, json);
  });

  it("robots stringify includes snippet directives", () => {
    const doc = sampleDocument();
    const content = robotsDirectiveToContentString(doc.robots!);
    assert.match(content, /max-snippet:-1/);
    assert.match(content, /max-image-preview:large/);
  });
});
