import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicEntityId,
  createInMemoryEntityStore,
  createGraphQueryService,
  createNormalizationPipeline,
  createSearchIntelligencePlatform,
  organizationSchemaFields,
  validateSchemaGraph,
} from "../index";
import { buildGraphBackedSchema } from "../schema/graph-consumer";

// Re-export helper through index would pull server modules; import path kept local for tests.
async function seedOrg() {
  const store = createInMemoryEntityStore();
  const query = createGraphQueryService(store);
  const normalization = createNormalizationPipeline({ store });
  await normalization.normalizeSourceRecord({
    source: "company_profile",
    sourceKey: "company:brt",
    entityType: "Organization",
    slug: "brt-trading",
    properties: {
      name: "BRT Trading",
      logo: "https://cdn.example/logo.png",
      phone: "+971500000000",
      email: "info@brt.example",
      address: "Dubai",
      sameAs: ["https://linkedin.com/company/brt"],
      geo: { latitude: 25.2048, longitude: 55.2708 },
    },
  });
  return { store, query };
}

test("graph-backed schema emits Organization WebSite WebPage with public entity refs", async () => {
  const { store, query } = await seedOrg();
  const result = await buildGraphBackedSchema({
    store,
    query,
    siteOrigin: "https://brt.example",
    pageUrl: "https://brt.example/en",
    pageTitle: "Home",
    pageDescription: "Radios and wireless",
    locale: "en",
  });

  const types = result.graph["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("WebPage"));
  assert.ok(types.includes("ImageObject"));

  const org = result.graph["@graph"].find((n) => n["@type"] === "Organization")!;
  assert.equal(typeof org["@id"], "string");
  assert.ok(String(org["@id"]).includes("organization-brt-trading"));
  assert.ok(!String(org["@id"]).match(/[0-9a-f-]{36}/i), "must not expose UUID in @id");

  const issues = validateSchemaGraph(result.graph, {
    pageUrl: "https://brt.example/en",
    locale: "en",
  });
  assert.equal(issues.some((i) => i.code === "missing-organization"), false);
  assert.equal(result.shadowMode, true);
});

test("organizationSchemaFields never returns database ids", async () => {
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });
  await platform.ingestCompanyProfile({
    name: "BRT Trading",
    phone: "+971500000000",
    socialLinks: { linkedin: "https://linkedin.com/company/brt" },
  });
  const org = await platform.query.getEntity(buildPublicEntityId("Organization", "brt-trading"));
  assert.ok(org);
  const fields = organizationSchemaFields(org);
  assert.equal(fields.publicId, "entity://organization/brt-trading");
  assert.equal(fields.name, "BRT Trading");
  assert.deepEqual(Object.keys(fields).includes("uuid"), false);
});
