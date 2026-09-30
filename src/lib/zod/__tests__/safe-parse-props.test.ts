/**
 * Manual E2E (after rebuild/redeploy):
 * 1. Add Catalog, Content List, Hero, Search, Video Hero blocks → save → view public page.
 * 2. Confirm no marketing error boundary on /en routes; check dev server logs for diagnostics.
 * 3. Add two Catalog blocks → edit one → confirm the other is unchanged.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { safeParseProps } from "@/lib/zod/safe-parse-props";

const testSchema = z.object({
  mode: z.enum(["grid", "list"]).default("grid"),
  limit: z.number().default(6),
});

const DEFAULT_TEST = testSchema.parse({});

describe("safeParseProps", () => {
  let originalNodeEnv: string | undefined;
  let warnCalls: unknown[][];
  let errorCalls: unknown[][];

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    warnCalls = [];
    errorCalls = [];
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args);
    };
    console.error = (...args: unknown[]) => {
      errorCalls.push(args);
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns parsed data for valid props", () => {
    const result = safeParseProps(testSchema, { mode: "list", limit: 3 }, DEFAULT_TEST, "test");
    assert.equal(result.mode, "list");
    assert.equal(result.limit, 3);
    assert.equal(warnCalls.length, 0);
    assert.equal(errorCalls.length, 0);
  });

  it("returns fallback for invalid enum props without throwing", () => {
    const result = safeParseProps(
      testSchema,
      { mode: "invalid", limit: 12 },
      DEFAULT_TEST,
      "test-invalid-enum",
    );
    assert.equal(result.mode, "grid");
    assert.equal(result.limit, 6);
  });

  it("logs full Zod detail in development", () => {
    process.env.NODE_ENV = "development";
    safeParseProps(testSchema, { mode: "bad" }, DEFAULT_TEST, "dev-context");
    assert.equal(errorCalls.length, 1);
    assert.match(String(errorCalls[0]?.[0]), /dev-context/);
  });

  it("logs context-only warning in production", () => {
    process.env.NODE_ENV = "production";
    safeParseProps(testSchema, { mode: "bad" }, DEFAULT_TEST, "prod-context");
    assert.equal(warnCalls.length, 1);
    assert.match(String(warnCalls[0]?.[0]), /prod-context/);
    assert.equal(errorCalls.length, 0);
  });
});
