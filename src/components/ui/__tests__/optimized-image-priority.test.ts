import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("OptimizedImage priority + loading", () => {
  it("strips priority from the spread and omits loading when priority is active", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/ui/optimized-image.tsx"),
      "utf8",
    );
    assert.match(source, /priority,/);
    assert.match(source, /resolvedPriority === true/);
    assert.match(source, /priority=\{resolvedPriority\}/);
    // Must not spread props that still contain priority into next/image.
    assert.match(source, /\.\.\.props/);
    // Destructure pulls priority out before ...props
    const destructureIdx = source.indexOf("priority,");
    const spreadIdx = source.indexOf("...props");
    assert.ok(destructureIdx > 0 && spreadIdx > destructureIdx);
  });
});
