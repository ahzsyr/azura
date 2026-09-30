import assert from "node:assert/strict";
import test from "node:test";

import { buildProductSpecCompareTable } from "@/features/comparison/product-comparison-engine";
import type { CanonicalSpecRecord } from "@/features/specifications/types";

function canon(
  id: string,
  value: string,
  name?: string,
): Record<string, CanonicalSpecRecord> {
  return {
    [id]: {
      value,
      display: value,
      name: name || id.split(".").pop() || id,
    },
  };
}

test("buildProductSpecCompareTable aligns frequency range across source groups via canonical id", () => {
  const entries = buildProductSpecCompareTable(
    [
      {
        canonical_specs: canon(
          "radio.frequency_range",
          "UHF: 400-480MHz VHF: 136-174MHz",
          "Frequency Range",
        ),
      },
      {
        canonical_specs: canon(
          "radio.frequency_range",
          "VHF: 136-174 MHz; UHF: 350-400 MHz",
          "Frequency Range",
        ),
      },
    ],
    "all",
  );

  const rows = entries.filter((e) => e.type === "row");
  const freqRows = rows.filter((r) => r.key === "radio.frequency_range");
  assert.equal(freqRows.length, 1);
  assert.deepEqual(freqRows[0]?.values, [
    "UHF: 400-480MHz VHF: 136-174MHz",
    "VHF: 136-174 MHz; UHF: 350-400 MHz",
  ]);
});

test("buildProductSpecCompareTable keeps cellular bands separate from radio frequency range", () => {
  const entries = buildProductSpecCompareTable(
    [
      {
        canonical_specs: {
          ...canon("radio.frequency_range", "UHF: 400-480MHz"),
          ...canon("connectivity.cellular_bands", "2G: B2/B3"),
        },
      },
      {
        canonical_specs: canon("radio.frequency_range", "VHF: 136-174 MHz"),
      },
    ],
    "all",
  );
  const rowKeys = entries.filter((e) => e.type === "row").map((r) => r.key);
  assert.ok(rowKeys.includes("radio.frequency_range"));
  assert.ok(rowKeys.includes("connectivity.cellular_bands"));
});
