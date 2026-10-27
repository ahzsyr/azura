/**
 * Static guard: admin route transitions must not hydrate through AnimatePresence
 * mode="wait" (can return null vs SSR text → React #418).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("admin motion hydration (React #418)", () => {
  it("AdminPageTransition gates AnimatePresence until after mount", async () => {
    const src = await readFile(new URL("../admin-motion.tsx", import.meta.url), "utf8");
    assert.match(src, /presenceReady/);
    assert.match(src, /shouldReduceMotion \|\| !presenceReady/);
    assert.match(src, /AnimatePresence mode="wait" initial=\{false\}/);
  });

  it("AdminAnimatePresence renders children plainly before mount", async () => {
    const src = await readFile(new URL("../admin-motion.tsx", import.meta.url), "utf8");
    assert.match(src, /export function AdminAnimatePresence/);
    assert.match(src, /if \(!ready\) return <>\{children\}<\/>/);
  });

  it("formatAdminDate pins UTC timezone", async () => {
    const src = await readFile(
      new URL("../../../../lib/admin-date-format.ts", import.meta.url),
      "utf8",
    );
    assert.match(src, /timeZone:\s*"UTC"/);
  });
});
