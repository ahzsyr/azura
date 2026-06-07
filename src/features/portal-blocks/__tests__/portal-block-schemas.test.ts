import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  documentationNavPropsSchema,
  knowledgeBasePropsSchema,
  partnerDirectoryPropsSchema,
  pricingCalculatorPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
} from "@/features/portal-blocks/schemas/portal-blocks";

describe("portal block schemas", () => {
  it("parses pricing calculator defaults", () => {
    const p = pricingCalculatorPropsSchema.parse({});
    assert.equal(p.layout, "stacked");
    assert.equal(p.showDescription, true);
  });

  it("parses knowledge base layout", () => {
    const p = knowledgeBasePropsSchema.parse({ layout: "sidebar" });
    assert.equal(p.layout, "sidebar");
  });

  it("parses documentation nav", () => {
    const p = documentationNavPropsSchema.parse({ docPortalSlug: "api" });
    assert.equal(p.docPortalSlug, "api");
  });

  it("parses status dashboard polling", () => {
    const p = statusDashboardPropsSchema.parse({ pollingIntervalMs: 10000 });
    assert.equal(p.pollingIntervalMs, 10000);
  });

  it("parses team directory", () => {
    const p = teamDirectoryPropsSchema.parse({ teamDirectorySlug: "team" });
    assert.equal(p.teamDirectorySlug, "team");
  });

  it("parses partner directory", () => {
    const p = partnerDirectoryPropsSchema.parse({ partnerProgramSlug: "partners" });
    assert.equal(p.partnerProgramSlug, "partners");
  });
});
