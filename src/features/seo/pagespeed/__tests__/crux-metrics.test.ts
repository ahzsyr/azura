import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCruxFieldMetrics } from "@/features/seo/pagespeed/crux-metrics";

describe("parseCruxFieldMetrics", () => {
  it("uses lab_fallback when category is NONE", () => {
    const parsed = parseCruxFieldMetrics({ overall_category: "NONE", metrics: {} });
    assert.equal(parsed.dataSource, "lab_fallback");
    assert.deepEqual(parsed.warnings, []);
  });

  it("warns only on CrUX p75 breaches", () => {
    const parsed = parseCruxFieldMetrics({
      overall_category: "SLOW",
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3200, category: "SLOW" },
        INTERACTION_TO_NEXT_PAINT: { percentile: 250, category: "SLOW" },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 15, category: "AVERAGE" },
      },
    });
    assert.equal(parsed.dataSource, "crux");
    assert.equal(parsed.lcpMs, 3200);
    assert.equal(parsed.inpMs, 250);
    assert.equal(parsed.cls, 0.15);
    assert.equal(parsed.warnings.length, 3);
  });
});
