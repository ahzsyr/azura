import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { firstRouteSkeleton, isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";

describe("route skeleton detection", () => {
  it("detects PageLoadingSkeleton for stale-page hold gating", () => {
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

describe("marketing page transition stale-page hold", () => {
  it("does not render skeleton overlay — holds stale page until real content", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../../../components/motion/marketing-page-transition.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /route-loading-overlay--skeleton/);
    assert.doesNotMatch(source, /overlaySkeleton/);
    assert.match(source, /route-page-layer--stale/);
    assert.match(source, /emitRouteContentReady/);
  });

  it("marketing loading boundaries use layout-matched skeletons", async () => {
    const { readFile } = await import("node:fs/promises");
    const loading = await readFile(
      new URL("../../../app/[locale]/(marketing)/loading.tsx", import.meta.url),
      "utf8",
    );
    assert.match(loading, /createRouteLoading\("home"\)/);
  });
});
