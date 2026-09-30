/**
 * Guard: buildSchemaContext must not require headers() when pathname is provided
 * (resolveSeoDocument is wrapped in unstable_cache).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("schema context request-safety", () => {
  it("skips headers() when overrides.pathname is set", async () => {
    const src = await readFile(
      new URL("../build-schema-context.server.ts", import.meta.url),
      "utf8",
    );
    assert.match(src, /overrides\?\.pathname/);
    assert.match(src, /Avoid headers\(\) when pathname is already provided/);
    // Must not unconditionally await headers() before checking overrides
    assert.doesNotMatch(
      src,
      /export async function buildSchemaContext[\s\S]*?const headerStore = await headers\(\);\s*const pathname = overrides/,
    );
  });

  it("StructuredDataGraph does not call cached resolveSeoDocument", async () => {
    const src = await readFile(
      new URL("../../../../components/structured-data-graph.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(src.includes('from "@/features/seo/core/seo-resolver"'), false);
    assert.equal(src.includes("await resolveSeoDocument"), false);
    assert.match(src, /buildStructuredDataResult/);
    assert.match(src, /catch/);
  });
});
