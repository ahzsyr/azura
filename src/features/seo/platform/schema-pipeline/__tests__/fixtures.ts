import type { SchemaContext } from "../types";

const baseSiteOrigin = "https://example.com";

export function createHomeContextFixture(): SchemaContext {
  return {
    site: {
      company: {
        id: "default",
        name: "BRT Trading",
        registrationNo: "REG-123",
        licenseInfo: "Licensed",
        phone: "+971500000000",
        whatsapp: "+971500000000",
        email: "info@example.com",
        socialLinks: { facebook: "https://facebook.com/brt" },
        trustBadges: [],
        updatedAt: new Date(),
        localizedLegacy: {
          addressEn: "Dubai, UAE",
        },
      },
      brand: {
        brandName: "BRT Trading",
        brandShort: "BRT",
        tagline: "Networking solutions",
        logoUrl: "/uploads/logo.png",
      },
      logoUrl: "/uploads/logo.png",
      locales: [
        {
          code: "en",
          urlPrefix: "en",
          label: "English",
          htmlLang: "en",
          dir: "ltr",
          flag: "🇬🇧",
          isDefault: true,
        },
      ],
      structuredConfig: { entityType: "ElectronicsStore" },
      businessPhotos: [
        {
          url: "/uploads/office.jpg",
          width: 1200,
          height: 630,
          role: "office",
        },
      ],
    },
    page: {
      pageType: "static",
      path: "/",
      pageKey: "home",
      title: "Home",
      description: "Welcome to BRT Trading",
      faqItems: [],
      breadcrumbItems: [],
    },
    runtime: {
      locale: "en",
      localePrefix: "en",
      canonicalUrl: `${baseSiteOrigin}/en`,
      siteOrigin: baseSiteOrigin,
      environment: "test",
    },
  };
}

export function createProductContextFixture(): SchemaContext {
  const home = createHomeContextFixture();
  return {
    ...home,
    page: {
      pageType: "product",
      path: "/products/industrial-router",
      title: "Industrial Router",
      description: "High performance router",
      faqItems: [],
      breadcrumbItems: [
        { name: "Home", href: "/en" },
        { name: "Products", href: "/en/products" },
        { name: "Industrial Router", href: "/en/products/industrial-router" },
      ],
      product: {
        id: "prod-1",
        slug: "industrial-router",
        name: "Industrial Router",
        productTitle: "Industrial Router",
        title: "Industrial Router",
        description: "High performance router",
        short_description: "High performance router",
        brand: "BRT",
        price: { value: 499, currency: "USD" },
        ean: "1234567890123",
        mpn: "IR-1000",
        availability: "InStock",
        reviews: { rating: 4.5, count: 10, comments: [] },
        media: {
          images: [{ url: `${baseSiteOrigin}/uploads/router.jpg`, type: "main" }],
          videos: [],
        },
      } as SchemaContext["page"]["product"],
    },
    runtime: {
      ...home.runtime,
      canonicalUrl: `${baseSiteOrigin}/en/products/industrial-router`,
    },
  };
}

export function createFaqContextFixture(): SchemaContext {
  const home = createHomeContextFixture();
  return {
    ...home,
    page: {
      pageType: "faq",
      path: "/faq/support",
      title: "Support FAQ",
      description: "Common support questions",
      faqItems: [
        { question: "What is BRT Trading?", answer: "A networking supplier." },
        { question: "Do you offer support?", answer: "Yes, 24/7 support." },
      ],
      breadcrumbItems: [
        { name: "Home", href: "/en" },
        { name: "Support FAQ", href: "/en/faq/support" },
      ],
    },
    runtime: {
      ...home.runtime,
      canonicalUrl: `${baseSiteOrigin}/en/faq/support`,
    },
  };
}

export function createCmsFaqBlocksContextFixture(): SchemaContext {
  const home = createHomeContextFixture();
  return {
    ...home,
    page: {
      pageType: "cms",
      path: "/smart-home",
      title: "Smart Home",
      description: "Smart home solutions",
      faqItems: [
        { question: "What is smart home?", answer: "Connected home automation." },
        { question: "What is smart home?", answer: "Duplicate should dedupe." },
        { question: "Do you install?", answer: "Yes, professional installation." },
      ],
      breadcrumbItems: [],
    },
    runtime: {
      ...home.runtime,
      canonicalUrl: `${baseSiteOrigin}/en/smart-home`,
    },
  };
}
