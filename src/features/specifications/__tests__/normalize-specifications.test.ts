import assert from "node:assert/strict";
import test from "node:test";

import { matchSpecification } from "@/features/specifications/matcher";
import { ensureCanonicalSpecsOnProduct } from "@/features/specifications/normalize-specifications";

test("TS matcher aligns Belfone GENERAL frequency range to radio.frequency_range", () => {
  const { match } = matchSpecification(
    "GENERAL",
    "Frequency Range",
    "VHF: 136-174 MHz; UHF: 350-400 MHz",
    "radio",
  );
  assert.equal(match?.specId, "radio.frequency_range");
});

test("TS matcher maps CONNECTION Frequencies with cellular syntax", () => {
  const { match } = matchSpecification(
    "CONNECTION",
    "Frequencies",
    "2G: B2/B3/B5\n4G-FDD: B1/B2",
    "radio",
  );
  assert.equal(match?.specId, "connectivity.cellular_bands");
});

test("TS matcher treats bare Power as ambiguous", () => {
  const { match, reason, candidates } = matchSpecification("GENERAL", "Power", "5W", "radio");
  assert.equal(match, null);
  assert.equal(reason, "AMBIGUOUS");
  assert.ok(candidates.length >= 2);
});

test("ensureCanonicalSpecsOnProduct backfills legacy specifications", () => {
  const product = ensureCanonicalSpecsOnProduct({
    brand: "Inrico",
    cat_path_titles: ["Security Systems", "Two-way Radios"],
    specifications: [
      {
        technology: "DMR",
        items: [{ name: "Frequency Range", value: "UHF: 400-480MHz" }],
      },
    ],
  });
  assert.ok(product.canonical_specs?.["radio.frequency_range"]);
  assert.ok(product.source_specifications?.length);
});
