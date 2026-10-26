import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

const calls: string[] = [];
const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "next/cache") {
    return {
      unstable_cache: (fn: unknown) => fn,
      revalidateTag: (tag: string) => {
        calls.push(`tag:${tag}`);
      },
      revalidatePath: (path: string) => {
        calls.push(`path:${path}`);
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

test("llms.txt cache refresh invalidates the tag and both public paths", async () => {
  const { CACHE_TAGS, revalidateLlmsTxt } = await import("@/services/cache");
  calls.length = 0;
  revalidateLlmsTxt();
  assert.ok(calls.includes(`tag:${CACHE_TAGS.llms}`));
  assert.ok(calls.includes("path:/llms.txt"));
  assert.ok(calls.includes("path:/api/seo/llms"));
});

test("SEO document refresh invalidates the broad document tag", async () => {
  const { CACHE_TAGS, revalidateSeoDocuments } = await import("@/services/cache");
  calls.length = 0;
  revalidateSeoDocuments();
  assert.ok(calls.includes(`tag:${CACHE_TAGS.seoDocumentAll}`));
});
