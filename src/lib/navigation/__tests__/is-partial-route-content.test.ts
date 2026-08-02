import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { containsPartialRouteContent } from "@/lib/navigation/is-partial-route-content";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";

describe("partial route content detection", () => {
  it("detects RouteSuspenseFallback as partial content", () => {
    const fallback = createElement(RouteSuspenseFallback, { variant: "grid" });
    assert.equal(containsPartialRouteContent(fallback), true);
  });

  it("detects loading text paragraphs as partial content", () => {
    const fallback = createElement("p", null, "Loading catalog…");
    assert.equal(containsPartialRouteContent(fallback), true);
  });

  it("treats complete page shells without fallbacks as ready", () => {
    const page = createElement("div", null, createElement("h1", null, "Products"));
    assert.equal(containsPartialRouteContent(page), false);
  });
});
