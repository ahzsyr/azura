import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { firstRouteSkeleton, isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";
import { containsPartialRouteContent } from "@/lib/navigation/is-partial-route-content";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";
describe("route skeleton detection", () => {
  it("detects PageLoadingSkeleton for stale-page hold gating", () => {
    const skeleton = createElement(PageLoadingSkeleton, { variant: "grid" });
    assert.equal(isRouteSkeleton(skeleton), true);
    assert.ok(firstRouteSkeleton(skeleton));
  });

  it("does not treat nested Suspense island skeletons as the whole route", () => {
    // Mirror the rendered RouteSuspenseFallback DOM (attr on the wrapper div).
    const island = createElement(
      "div",
      { "data-route-partial-fallback": true },
      createElement(PageLoadingSkeleton, { variant: "grid", embedded: true }),
    );
    const page = createElement(
      "div",
      null,
      createElement("h1", null, "Real home content"),
      island,
    );
    assert.equal(isRouteSkeleton(page), false);
    assert.equal(isRouteSkeleton(island), false);
    assert.equal(containsPartialRouteContent(page), true);
  });

  it("detects compile-time build shell at the route root", () => {
    const shell = createElement("div", {
      "data-build-shell": "true",
      className: "min-h-[40vh]",
    });
    assert.equal(isRouteSkeleton(shell), true);
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

  it("omits route-skeleton attr when embedded", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../../../components/layout/page-loading-skeleton.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /!embedded \? \{ \[ROUTE_SKELETON_ATTR\]: true \}/);
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
    // First load must not use deep !realContent / partial heuristics to swap HTML.
    assert.doesNotMatch(source, /isRealContent/);
    assert.match(source, /forceCommitted/);
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
