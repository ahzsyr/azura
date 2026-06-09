import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { firstRouteSkeleton, isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";

describe("route skeleton overlay", () => {
  it("detects PageLoadingSkeleton for overlay capture", () => {
    const skeleton = createElement(PageLoadingSkeleton, { variant: "grid" });
    assert.equal(isRouteSkeleton(skeleton), true);
    assert.ok(firstRouteSkeleton(skeleton));
  });

});

describe("page loading skeleton contrast", () => {
  it("uses visible skeleton surfaces not bg-muted", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../../../components/layout/page-loading-skeleton.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /bg-muted-foreground\/20/);
    assert.doesNotMatch(source, /\bbg-muted\b(?!-foreground)/);
  });
});

describe("marketing page transition overlay", () => {
  it("renders overlaySkeleton inside skeleton overlay class", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../../../components/motion/marketing-page-transition.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /route-loading-overlay--skeleton/);
    assert.match(source, /\{overlaySkeleton\}/);
    assert.doesNotMatch(source, /route-loading-overlay--minimal/);
  });
});
