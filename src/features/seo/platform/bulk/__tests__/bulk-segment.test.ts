import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BULK_SEGMENT_THRESHOLD,
  DEFAULT_BULK_SEGMENT_SIZE,
  descriptorStreamAction,
  planBulkSegments,
  segmentRangeLabel,
} from "@/features/seo/platform/bulk/bulk-segment";

describe("bulk-segment", () => {
  it("planBulkSegments splits 100 items into four segments of 25", () => {
    const segments = planBulkSegments(100, 25);
    assert.equal(segments.length, 4);
    assert.deepEqual(
      segments.map((s) => ({ offset: s.offset, limit: s.limit })),
      [
        { offset: 0, limit: 25 },
        { offset: 25, limit: 25 },
        { offset: 50, limit: 25 },
        { offset: 75, limit: 25 },
      ]
    );
    assert.equal(segments[3]?.rangeLabel, segmentRangeLabel(75, 25, 100));
  });

  it("planBulkSegments handles partial last segment", () => {
    const segments = planBulkSegments(47, 25);
    assert.equal(segments.length, 2);
    assert.equal(segments[0]?.limit, 25);
    assert.equal(segments[1]?.offset, 25);
    assert.equal(segments[1]?.limit, 22);
  });

  it("returns empty plan for zero totals", () => {
    assert.deepEqual(planBulkSegments(0, 25), []);
    assert.deepEqual(planBulkSegments(10, 0), []);
  });

  it("defaults match product bulk threshold", () => {
    assert.equal(DEFAULT_BULK_SEGMENT_SIZE, 25);
    assert.equal(BULK_SEGMENT_THRESHOLD, 25);
  });

  it("descriptorStreamAction paginates a stream of 10 items", () => {
    const offset = 3;
    const limit = 4;
    const actions: Array<"skip" | "process" | "stop"> = [];
    let processed = 0;

    for (let streamIndex = 0; streamIndex < 10; streamIndex++) {
      const action = descriptorStreamAction(streamIndex, offset, limit, processed);
      if (action === "stop") break;
      if (action === "skip") continue;
      actions.push(action);
      processed++;
    }

    assert.equal(actions.length, 4);
    assert.deepEqual(actions, ["process", "process", "process", "process"]);
  });

  it("descriptorStreamAction processes from start when no offset", () => {
    let processed = 0;
    let count = 0;
    for (let streamIndex = 0; streamIndex < 5; streamIndex++) {
      const action = descriptorStreamAction(streamIndex, 0, undefined, processed);
      if (action === "stop") break;
      if (action === "process") {
        processed++;
        count++;
      }
    }
    assert.equal(count, 5);
  });
});
