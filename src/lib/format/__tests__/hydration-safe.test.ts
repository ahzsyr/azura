import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatHydrationSafeCurrency,
  formatHydrationSafeDate,
  formatHydrationSafeDateTime,
  hydrationSafeLocale,
  toHydrationSafeIso,
  toValidDate,
} from "@/lib/format/hydration-safe";

describe("hydration-safe formatters", () => {
  it("normalizes short and BCP-47 locales", () => {
    assert.equal(hydrationSafeLocale("en"), "en-US");
    assert.equal(hydrationSafeLocale("ar"), "ar-AE");
    assert.equal(hydrationSafeLocale("ar-EG"), "ar-AE");
  });

  it("formats the same date string twice identically", () => {
    const iso = "2024-06-15T00:00:00.000Z";
    assert.equal(formatHydrationSafeDate(iso, "en"), formatHydrationSafeDate(iso, "en-US"));
    assert.equal(
      formatHydrationSafeDateTime(iso, "en"),
      formatHydrationSafeDateTime(iso, "en-US"),
    );
  });

  it("formats currency with a stable en-US pattern", () => {
    const a = formatHydrationSafeCurrency(1200, "USD", "en");
    const b = formatHydrationSafeCurrency(1200, "USD", "en-US");
    assert.equal(a, b);
    assert.match(a, /1,200|1200/);
  });

  it("rejects invalid dates instead of throwing (React #441 guard)", () => {
    assert.equal(toValidDate("not-a-date"), null);
    assert.equal(toValidDate(""), null);
    assert.equal(toValidDate(undefined), null);
    assert.equal(toHydrationSafeIso("not-a-date"), null);
    assert.equal(formatHydrationSafeDate("not-a-date", "en"), "");
    assert.equal(formatHydrationSafeDateTime("not-a-date", "en"), "");
    assert.equal(toHydrationSafeIso("2024-06-15T00:00:00.000Z"), "2024-06-15T00:00:00.000Z");
  });
});
