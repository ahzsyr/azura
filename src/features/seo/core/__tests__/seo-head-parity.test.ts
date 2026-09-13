import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentToMetadata } from "@/features/seo/core/document-to-metadata";
import { resolveRobots } from "@/features/seo/core/seo-robots";
import { isIndexableSeoDocument } from "@/features/seo/core/is-indexable-seo-document";
import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";
import { serializeYoastHead } from "@/features/seo/integrations/yoast/yoast-head.serializer";

type FixtureCase = {
  name: string;
  doc: ResolvedSeoDocument;
  expect: {
    hasDescription: boolean;
    hasCanonical: boolean;
    hasRobots: boolean;
    ogType?: string;
    noOgType?: boolean;
    noOgImage?: boolean;
    indexable: boolean;
  };
};

function baseIdentity(overrides: Partial<ResolvedSeoDocument["identity"]> = {}) {
  return {
    pageType: "static",
    localePrefix: "en",
    languageCode: "en",
    publicPath: "/",
    ...overrides,
  };
}

function indexableDoc(overrides: Partial<ResolvedSeoDocument> = {}): ResolvedSeoDocument {
  const robots = resolveRobots({ status: 200 })!;
  return {
    url: "https://example.com/en/about",
    status: 200,
    title: "About | Example",
    pageTitle: "About",
    description: "About us",
    canonical: "https://example.com/en/about",
    robots,
    openGraph: {
      locale: "en_US",
      type: "article",
      title: "About | Example",
      description: "About us",
      url: "https://example.com/en/about",
      siteName: "Example",
      images: [{ url: "https://example.com/og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", site: "@example" },
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          url: "https://example.com/en/about",
        },
      ],
    },
    identity: baseIdentity({ pageKey: "about", publicPath: "/about" }),
    indexable: true,
    ...overrides,
  };
}

const FIXTURES: FixtureCase[] = [
  {
    name: "homepage EN",
    doc: indexableDoc({
      url: "https://example.com/",
      title: "Example | Tagline",
      canonical: "https://example.com/",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/" }],
      },
      openGraph: {
        locale: "en_US",
        type: "website",
        title: "Example | Tagline",
        url: "https://example.com/",
        siteName: "Example",
      },
      identity: baseIdentity({ pageKey: "home", publicPath: "/" }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "website", indexable: true },
  },
  {
    name: "homepage AR",
    doc: indexableDoc({
      url: "https://example.com/ar",
      title: "مثال | شعار",
      canonical: "https://example.com/ar",
      htmlLang: "ar",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/ar" }],
      },
      openGraph: {
        locale: "ar_SA",
        type: "website",
        title: "مثال | شعار",
        url: "https://example.com/ar",
        siteName: "مثال",
      },
      identity: baseIdentity({ localePrefix: "ar", languageCode: "ar", pageKey: "home", publicPath: "/" }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "website", indexable: true },
  },
  {
    name: "product EN",
    doc: indexableDoc({
      url: "https://example.com/en/products/widget",
      title: "Widget | Example",
      canonical: "https://example.com/en/products/widget",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/en/products/widget" }],
      },
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "Widget | Example",
        url: "https://example.com/en/products/widget",
        siteName: "Example",
        images: [{ url: "https://example.com/product.jpg" }],
      },
      identity: baseIdentity({ pageType: "product", pageKey: "product:widget", publicPath: "/products/widget", slug: "widget" }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "noindex",
    doc: indexableDoc({
      robots: resolveRobots({ status: 200, pageControls: "noindex, follow" })!,
      canonical: undefined,
      indexable: false,
    }),
    expect: { hasDescription: true, hasCanonical: false, hasRobots: true, ogType: "article", indexable: false },
  },
  {
    name: "custom canonical",
    doc: indexableDoc({
      canonical: "https://example.com/consolidated",
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "About | Example",
        url: "https://example.com/consolidated",
        siteName: "Example",
      },
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/consolidated" }],
      },
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "404",
    doc: {
      url: "https://example.com/en/missing",
      status: 404,
      title: "Page not found | Example",
      robots: null,
      openGraph: {
        locale: "en_US",
        title: "Page not found | Example",
        siteName: "Example",
      },
      identity: baseIdentity({ publicPath: "/missing" }),
      indexable: false,
    },
    expect: {
      hasDescription: false,
      hasCanonical: false,
      hasRobots: false,
      noOgType: true,
      noOgImage: true,
      indexable: false,
    },
  },
  {
    name: "search",
    doc: {
      url: "https://example.com/en/search?q=radio",
      status: 200,
      title: "radio | Example",
      robots: resolveRobots({ status: 200, templateControls: "noindex, follow" })!,
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "radio | Example",
        siteName: "Example",
      },
      identity: baseIdentity({ pageType: "search", pageKey: "search", publicPath: "/search" }),
      indexable: false,
    },
    expect: { hasDescription: false, hasCanonical: false, hasRobots: true, ogType: "article", indexable: false },
  },
  {
    name: "cms page EN",
    doc: indexableDoc({
      url: "https://example.com/en/about-us",
      title: "About Us | Example",
      canonical: "https://example.com/en/about-us",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/en/about-us" }],
      },
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "About Us | Example",
        url: "https://example.com/en/about-us",
        siteName: "Example",
        publishedTime: "2024-01-15T10:00:00.000Z",
        modifiedTime: "2024-06-01T12:00:00.000Z",
        authors: ["Jane Doe"],
      },
      identity: baseIdentity({
        pageType: "cms",
        pageKey: "cms:about-us",
        publicPath: "/about-us",
        slug: "about-us",
      }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "cms page AR",
    doc: indexableDoc({
      url: "https://example.com/ar/about-us",
      title: "من نحن | مثال",
      canonical: "https://example.com/ar/about-us",
      htmlLang: "ar",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/ar/about-us" }],
      },
      openGraph: {
        locale: "ar_SA",
        type: "article",
        title: "من نحن | مثال",
        url: "https://example.com/ar/about-us",
        siteName: "مثال",
      },
      identity: baseIdentity({
        pageType: "cms",
        localePrefix: "ar",
        languageCode: "ar",
        pageKey: "cms:about-us",
        publicPath: "/about-us",
        slug: "about-us",
      }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "blog post EN",
    doc: indexableDoc({
      url: "https://example.com/en/blog/launch-update",
      title: "Launch Update | Example",
      canonical: "https://example.com/en/blog/launch-update",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/en/blog/launch-update" }],
      },
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "Launch Update | Example",
        url: "https://example.com/en/blog/launch-update",
        siteName: "Example",
        publishedTime: "2025-03-01T08:00:00.000Z",
        modifiedTime: "2025-03-02T09:00:00.000Z",
        authors: ["Alex Writer"],
      },
      identity: baseIdentity({
        pageType: "blog",
        pageKey: "blog:launch-update",
        publicPath: "/blog/launch-update",
        slug: "launch-update",
      }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "blog post AR",
    doc: indexableDoc({
      url: "https://example.com/ar/blog/launch-update",
      title: "تحديث الإطلاق | مثال",
      canonical: "https://example.com/ar/blog/launch-update",
      htmlLang: "ar",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/ar/blog/launch-update" }],
      },
      openGraph: {
        locale: "ar_SA",
        type: "article",
        title: "تحديث الإطلاق | مثال",
        url: "https://example.com/ar/blog/launch-update",
        siteName: "مثال",
      },
      identity: baseIdentity({
        pageType: "blog",
        localePrefix: "ar",
        languageCode: "ar",
        pageKey: "blog:launch-update",
        publicPath: "/blog/launch-update",
        slug: "launch-update",
      }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
  {
    name: "taxonomy category EN",
    doc: indexableDoc({
      url: "https://example.com/en/blog/category/news",
      title: "News | Example",
      canonical: "https://example.com/en/blog/category/news",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "CollectionPage", url: "https://example.com/en/blog/category/news" }],
      },
      openGraph: {
        locale: "en_US",
        type: "article",
        title: "News | Example",
        url: "https://example.com/en/blog/category/news",
        siteName: "Example",
      },
      identity: baseIdentity({
        pageType: "taxonomy",
        pageKey: "category:news",
        publicPath: "/blog/category/news",
        slug: "news",
      }),
    }),
    expect: { hasDescription: true, hasCanonical: true, hasRobots: true, ogType: "article", indexable: true },
  },
];

function assertParity(fixture: FixtureCase) {
  const { doc, expect: exp } = fixture;
  const metadata = documentToMetadata(doc);
  const yoast = serializeYoastHead(doc);

  if (exp.hasDescription) {
    assert.ok(metadata.description?.trim());
    assert.ok(yoast.json.description?.trim());
  } else {
    assert.equal(metadata.description, undefined);
  }

  if (exp.hasCanonical) {
    assert.equal(metadata.alternates?.canonical, doc.canonical);
    assert.equal(yoast.json.canonical, doc.canonical);
  } else {
    assert.equal(metadata.alternates?.canonical, undefined);
    assert.equal(yoast.json.canonical, undefined);
  }

  if (exp.hasRobots) {
    assert.ok(metadata.robots);
    assert.ok(yoast.json.robots);
  } else {
    assert.equal(metadata.robots, undefined);
  }

  if (exp.ogType) {
    assert.equal(metadata.openGraph?.type, exp.ogType);
    assert.equal(yoast.json.og_type, exp.ogType);
  }
  if (exp.noOgType) {
    assert.equal(metadata.openGraph?.type, undefined);
    assert.equal(yoast.json.og_type, undefined);
  }
  if (exp.noOgImage) {
    assert.equal(metadata.openGraph?.images, undefined);
  }

  if (doc.schema && yoast.json.schema) {
    const webPage = doc.schema["@graph"]?.find((n) => (n as { "@type"?: string })["@type"] === "WebPage") as
      | { url?: string }
      | undefined;
    if (webPage?.url && doc.canonical) {
      assert.equal(webPage.url, doc.canonical);
    }
  }

  assert.equal(yoast.status, doc.status);
  assert.equal(yoast.json.title, doc.title);
}

describe("seo-head-parity", () => {
  for (const fixture of FIXTURES) {
    it(`Next metadata and Yoast agree for ${fixture.name}`, () => {
      assertParity(fixture);
    });
  }

  it("documentToMetadata uses absolute titles", () => {
    const metadata = documentToMetadata(
      indexableDoc({
        title: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
      }),
    );
    assert.deepEqual(metadata.title, {
      absolute: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
    });
  });

  it("omits empty description in Next metadata", () => {
    const doc = indexableDoc({ description: "   " });
    const metadata = documentToMetadata(doc);
    assert.equal(metadata.description, undefined);
  });

  it("Yoast schema matches document schema reference", () => {
    const doc = indexableDoc();
    const yoast = serializeYoastHead(doc);
    assert.deepEqual(yoast.json.schema, doc.schema);
  });

  it("isIndexableSeoDocument excludes manual canonical that differs from self URL", () => {
    const doc = indexableDoc({
      url: "https://example.com/en/about",
      canonical: "https://other.com/about",
    });
    assert.equal(isIndexableSeoDocument(doc), false);
  });

  it("final invariant: representations agree on core SEO fields", () => {
    const doc = indexableDoc({
      canonical: "https://example.com/en/about",
      schema: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage", url: "https://example.com/en/about" }],
      },
    });
    const metadata = documentToMetadata(doc);
    const yoast = serializeYoastHead(doc);
    assert.equal(metadata.alternates?.canonical, doc.canonical);
    assert.equal(yoast.json.canonical, doc.canonical);
    const webPage = doc.schema?.["@graph"]?.find(
      (n) => (n as { "@type"?: string })["@type"] === "WebPage",
    ) as { url?: string } | undefined;
    assert.equal(webPage?.url, doc.canonical);
    assert.equal(yoast.json.title, doc.title);
    assert.deepEqual(metadata.title, { absolute: doc.title });
  });
});
