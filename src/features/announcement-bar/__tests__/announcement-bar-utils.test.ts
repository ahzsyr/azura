import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeMarqueeRepeatCount,
  repeatAnnouncementLines,
  resolveMarqueeScrollDirection,
  scrollDurationSec,
} from "@/features/announcement-bar/announcement-bar-utils";
import type { NormalizedAnnouncementLine } from "@/features/announcement-bar/normalize-announcement-items";
import type { PublicLocale } from "@/i18n/locale-config";

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

describe("scrollDurationSec", () => {
  it("slows down when speed percent is below 100", () => {
    assert.equal(scrollDurationSec("medium", undefined, 50), 80);
  });

  it("speeds up when speed percent is above 100", () => {
    assert.equal(scrollDurationSec("medium", undefined, 200), 20);
  });

  it("uses custom duration before applying percent", () => {
    assert.equal(scrollDurationSec("medium", 30, 100), 30);
  });
});

describe("resolveMarqueeScrollDirection", () => {
  const locales: PublicLocale[] = [
    { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
    { code: "ar", urlPrefix: "ar", label: "Arabic", htmlLang: "ar", dir: "rtl", flag: "🇸🇦", isDefault: false },
  ];

  it("mirrors direction on RTL locales", () => {
    assert.equal(resolveMarqueeScrollDirection("left", "ar", locales), "right");
    assert.equal(resolveMarqueeScrollDirection("right", "ar", locales), "left");
  });

  it("keeps direction on LTR locales", () => {
    assert.equal(resolveMarqueeScrollDirection("left", "en", locales), "left");
    assert.equal(resolveMarqueeScrollDirection("right", "en", locales), "right");
  });
});
