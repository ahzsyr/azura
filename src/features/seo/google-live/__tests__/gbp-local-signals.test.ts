import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareGbpNapWithSite,
  mapGbpCategoryToSchemaEntityType,
  parseGbpLocation,
} from "../gbp-local-signals";

describe("gbp-local-signals", () => {
  it("maps GBP electronics category to ElectronicsStore", () => {
    assert.equal(
      mapGbpCategoryToSchemaEntityType({ name: "categories/gcid:electronics_store" }),
      "ElectronicsStore",
    );
    assert.equal(mapGbpCategoryToSchemaEntityType({ displayName: "Computer store" }), "ComputerStore");
  });

  it("parses phone, address, and category from a location payload", () => {
    const parsed = parseGbpLocation({
      name: "locations/1",
      title: "BRT ME",
      storefrontAddress: {
        addressLines: ["Sheikh Zayed Road"],
        locality: "Dubai",
        regionCode: "AE",
      },
      phoneNumbers: { primaryPhone: "+971 55 472 7292" },
      categories: { primaryCategory: { name: "categories/gcid:electronics_store" } },
    });
    assert.equal(parsed.phone, "+971 55 472 7292");
    assert.match(parsed.address ?? "", /Sheikh Zayed Road/);
    assert.equal(parsed.suggestedEntityType, "ElectronicsStore");
  });

  it("detects NAP drift against company and local landing pages", () => {
    const conflicts = compareGbpNapWithSite({
      gbp: { name: "BRT ME", phone: "+971 55 472 7292", address: "Dubai" },
      company: { name: "BRT ME", phone: "+971 50 000 0000", address: "Dubai" },
      pages: [{ source: "contact_page", name: "Contact", phone: "+971 55 472 7292" }],
    });
    assert.ok(conflicts.some((item) => item.includes("Phone mismatch")));
  });
});
