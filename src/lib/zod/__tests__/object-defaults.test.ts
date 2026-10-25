/**
 * zod v4 migration: `z.object(...).default({})` no longer re-applies inner
 * defaults (v3 did). `withObjectDefaults` restores filling while keeping
 * validation and idempotence.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { withObjectDefaults } from "@/lib/zod/object-defaults";

const emptyToUndefined = (value: unknown) =>
  value === "" || value == null ? undefined : value;

const panelSchema = z.object({
  panelStyle: z.preprocess(
    emptyToUndefined,
    z.enum(["glass", "solid"]).default("glass"),
  ),
  overlayOpacity: z.number().min(30).max(95).default(78),
  overlayBlurPx: z.coerce.number().min(0).max(32).default(16),
  note: z.string().optional(),
});

const outerSchema = z.object({ panel: withObjectDefaults(panelSchema) });

describe("withObjectDefaults", () => {
  it("fills inner defaults when the key is missing", () => {
    assert.deepEqual(outerSchema.parse({}).panel, {
      panelStyle: "glass",
      overlayOpacity: 78,
      overlayBlurPx: 16,
    });
  });

  it("keeps explicit values and fills the rest", () => {
    assert.deepEqual(outerSchema.parse({ panel: { overlayOpacity: 50 } }).panel, {
      panelStyle: "glass",
      overlayOpacity: 50,
      overlayBlurPx: 16,
    });
  });

  it("still rejects values outside the inner constraints", () => {
    assert.equal(outerSchema.safeParse({ panel: { overlayOpacity: 99 } }).success, false);
    assert.equal(outerSchema.safeParse({ panel: { panelStyle: "nope" } }).success, false);
  });

  it("is idempotent: output can be re-parsed", () => {
    const once = outerSchema.parse({ panel: { overlayOpacity: 40 } });
    assert.deepEqual(outerSchema.parse(once), once);
  });

  it("keeps a partial output idempotent (partially-defaulted sub-schemas)", () => {
    const partial = z.object({ bodyFont: z.string().optional(), heading: z.string().default("H") });
    const wrapped = withObjectDefaults(partial);
    const once = wrapped.parse(undefined);
    assert.deepEqual(once, { heading: "H" });
    assert.deepEqual(wrapped.parse({ bodyFont: "X" }), { bodyFont: "X", heading: "H" });
  });

  it("does not add keys that have no default", () => {
    assert.equal("note" in outerSchema.parse({}).panel, false);
    assert.equal(outerSchema.parse({ panel: { note: "x" } }).panel.note, "x");
  });

  it("preserves the inferred output type", () => {
    // Compile-time check: assigning into the plain schema's output type would
    // fail if the wrapper widened it to `unknown`.
    const settings: z.output<typeof panelSchema> = outerSchema.parse({}).panel;
    assert.equal(settings.panelStyle, "glass");
    assert.equal(settings.overlayOpacity, 78);
  });

  it("leaves schemas without defaults as a plain identity", () => {
    const strictSchema = z.object({ id: z.string() });
    const wrapped = withObjectDefaults(strictSchema);
    assert.equal(wrapped.safeParse({}).success, false);
    assert.deepEqual(wrapped.parse({ id: "a" }), { id: "a" });
  });
});
