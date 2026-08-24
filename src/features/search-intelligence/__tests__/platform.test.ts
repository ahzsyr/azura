import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicEntityId,
  createSearchIntelligencePlatform,
  resetSearchIntelligencePlatformForTests,
  parsePublicEntityId,
  isRelationshipAllowed,
  runStaticAnalysis,
  runContinuousCrawlAnalysis,
  scorePageAudit,
  schemaGraphFingerprint,
} from "../index";

test("public entity IDs are immutable and parseable", () => {
  const id = buildPublicEntityId("Organization", "BRT Trading LLC");
  assert.equal(id, "entity://organization/brt-trading-llc");
  const parsed = parsePublicEntityId(id);
  assert.deepEqual(parsed, { type: "Organization", slug: "brt-trading-llc" });
});

test("ontology rejects invalid relationships", () => {
  assert.equal(isRelationshipAllowed("HAS_BRAND", "Organization", "Brand"), true);
  assert.equal(isRelationshipAllowed("HAS_BRAND", "Product", "Brand"), false);
});

test("platform normalizes company profile into organization + sameAs profiles", async () => {
  resetSearchIntelligencePlatformForTests();
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });

  await platform.ingestCompanyProfile({
    name: "BRT Trading LLC",
    email: "info@brt.example",
    phone: "+971500000000",
    registrationNo: "123",
    socialLinks: {
      linkedin: "https://linkedin.com/company/brt",
      youtube: "https://youtube.com/@brt",
    },
  });

  const orgs = await platform.query.findByType("Organization");
  assert.equal(orgs.length, 1);
  assert.equal(orgs[0].publicId, "entity://organization/brt-trading-llc");
  assert.equal(orgs[0].uuid.includes("http"), false);

  const profiles = await platform.query.findByType("ExternalProfile");
  assert.equal(profiles.length, 2);

  const schema = await platform.buildSchema({
    pageUrl: "https://brt.example/en",
    pageTitle: "BRT Trading",
    pageDescription: "Two-way radios and wireless solutions",
    locale: "en",
  });

  assert.ok(schema.graph["@graph"].some((n) => n["@type"] === "Organization"));
  assert.ok(schema.graph["@graph"].some((n) => n["@type"] === "WebSite"));
  assert.ok(schema.graph["@graph"].some((n) => n["@type"] === "WebPage"));
  assert.ok(schemaGraphFingerprint(schema.graph).includes("Organization"));
});

test("policy engine prefers manual logo over importer", async () => {
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });
  await platform.ingestSourceRecords([
    {
      source: "importer",
      sourceKey: "import:org",
      entityType: "Organization",
      slug: "acme",
      properties: { name: "Acme", logo: "https://cdn.example/import-logo.png" },
    },
  ]);
  await platform.ingestSourceRecords([
    {
      source: "manual_admin",
      sourceKey: "manual:org",
      entityType: "Organization",
      slug: "acme",
      properties: { logo: "https://cdn.example/manual-logo.png" },
    },
  ]);

  const org = await platform.query.getEntity(buildPublicEntityId("Organization", "acme"));
  const logo = org?.properties.logo;
  assert.ok(logo && typeof logo === "object" && "value" in logo);
  assert.equal((logo as { value: string }).value, "https://cdn.example/manual-logo.png");
  assert.equal((logo as { source: string }).source, "manual_admin");
});

test("static analysis and continuous crawl are separate systems", () => {
  const staticIssues = runStaticAnalysis({
    url: "https://example.com/p",
    title: "",
    description: "short",
    h1s: ["One", "Two"],
    internalLinks: [],
  });
  assert.ok(staticIssues.some((i) => i.system === "static_analysis"));
  assert.ok(staticIssues.some((i) => i.title === "Missing title"));

  const crawlIssues = runContinuousCrawlAnalysis([
    {
      url: "https://example.com/p",
      status: 404,
      redirectChain: ["a", "b", "c", "a"],
      inSitemap: false,
      hasStructuredData: false,
      lcpMs: 5000,
    },
  ]);
  assert.ok(crawlIssues.every((i) => i.system === "continuous_crawl"));
  assert.ok(crawlIssues.some((i) => i.title === "Crawl failure detected"));
});

test("AI audit keeps deterministic and AI weights separate", () => {
  const score = scorePageAudit({
    page: {
      url: "https://example.com",
      title: "Home",
      description: "A sufficiently long meta description for the homepage content.",
      canonical: "https://example.com",
      h1s: ["Home"],
      internalLinks: ["/products"],
      wordCount: 200,
    },
    ai: {
      searchIntentFit: 0.5,
      readability: 0.5,
      trust: 0.5,
      authority: 0.5,
      ctaQuality: 0.5,
      topicalCoverage: 0.5,
      semanticDepth: 0.5,
    },
  });
  assert.equal(score.rulesWeight, 0.6);
  assert.equal(score.aiWeight, 0.4);
  assert.equal(score.aiScore, 50);
  assert.ok(score.total <= 100);
});

test("enterprise controls: revision rollback and indexation lifecycle", () => {
  const platform = createSearchIntelligencePlatform();
  const revision = platform.createRevision({
    targetType: "metadata",
    targetId: "page:home",
    summary: "Update title",
    before: { title: "Old" },
    after: { title: "New" },
  });
  const rolled = platform.rollback(revision.id);
  assert.ok(rolled);
  assert.deepEqual(rolled.restoreValue, { title: "Old" });

  const lifecycle = platform.indexation.transition("https://example.com", "created");
  platform.indexation.transition("https://example.com", "indexed");
  assert.equal(platform.indexation.get("https://example.com")?.state, "indexed");
  assert.equal(lifecycle.history.length >= 1, true);
  assert.equal(platform.indexation.alertUnexpected("indexed", "created"), true);
});

test("connectors share a lifecycle contract", () => {
  const platform = createSearchIntelligencePlatform();
  platform.connectors.configure("search_console");
  platform.connectors.authenticate("search_console", true);
  platform.connectors.beginSync("search_console");
  platform.connectors.completeSync("search_console", { clicks: 10 });
  const health = platform.connectors.listHealth().find((h) => h.connectorId === "search_console");
  assert.equal(health?.state, "ready");
  assert.equal(health?.ok, true);
});
