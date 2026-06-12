import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeMarqueeRepeatCount,
  repeatAnnouncementLines,
} from "@/features/announcement-bar/announcement-bar-utils";
import type { NormalizedAnnouncementLine } from "@/features/announcement-bar/normalize-announcement-items";

const sampleLine: NormalizedAnnouncementLine = {
  message: "Test announcement",
  href: "",
};

describe("repeatAnnouncementLines", () => {
  it("returns the same array when times is 1", () => {
    const lines = [sampleLine];
    assert.deepEqual(repeatAnnouncementLines(lines, 1), lines);
  });

  it("returns the same array when lines is empty", () => {
    assert.deepEqual(repeatAnnouncementLines([], 4), []);
  });

  it("repeats a single line multiple times", () => {
    const result = repeatAnnouncementLines([sampleLine], 4);
    assert.equal(result.length, 4);
    assert.equal(result.every((line) => line.message === sampleLine.message), true);
  });

  it("repeats a multi-item cycle in order", () => {
    const lines: NormalizedAnnouncementLine[] = [
      { message: "One", href: "" },
      { message: "Two", href: "" },
    ];
    const result = repeatAnnouncementLines(lines, 2);
    assert.deepEqual(
      result.map((line) => line.message),
      ["One", "Two", "One", "Two"],
    );
  });
});

describe("computeMarqueeRepeatCount", () => {
  it("computes repeat count to cover viewport twice", () => {
    assert.equal(computeMarqueeRepeatCount(100, 800), 16);
    assert.equal(computeMarqueeRepeatCount(900, 800), 2);
  });

  it("returns 1 when cycle already covers viewport twice", () => {
    assert.equal(computeMarqueeRepeatCount(2000, 800), 1);
  });

  it("falls back to 1 for invalid widths", () => {
    assert.equal(computeMarqueeRepeatCount(0, 800), 1);
    assert.equal(computeMarqueeRepeatCount(100, 0), 1);
    assert.equal(computeMarqueeRepeatCount(-50, 800), 1);
  });
});
