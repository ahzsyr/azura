import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  resolveBaseContentOverflow,
  resolveContentOverflowCssFlags,
  resolveContentOverflowForDevice,
} from "@/features/builder/styles/content-overflow-resolver";

function block(partial: Partial<BlockNode> & Pick<BlockNode, "type">): BlockNode {
  return {
    id: "b1",
    type: partial.type,
    props: partial.props ?? {},
    responsive: partial.responsive,
  };
}

describe("content-overflow-resolver", () => {
  it("inherits base testimonials slider settings", () => {
    const b = block({
      type: "testimonials",
      props: { layoutMode: "slider", sliderEnabled: true },
    });
    const base = resolveBaseContentOverflow(b);
    assert.equal(base.effectiveMode, "slider");
    assert.equal(base.sliderEnabled, true);
  });

  it("slider disabled falls back to grid", () => {
    const b = block({
      type: "testimonials",
      props: {},
      responsive: {
        mobile: { contentOverflow: { mode: "slider", sliderEnabled: false } },
      },
    });
    const mobile = resolveContentOverflowForDevice(b, "mobile");
    assert.equal(mobile.effectiveMode, "grid");
    assert.equal(mobile.sliderEnabled, false);
  });

  it("cascades desktop → tablet → mobile", () => {
    const b = block({
      type: "catalog",
      props: { displaySettings: { layoutMode: "grid" } },
      responsive: {
        desktop: { contentOverflow: { mode: "grid" } },
        tablet: { contentOverflow: { mode: "slider", sliderEnabled: true } },
      },
    });
    const flags = resolveContentOverflowCssFlags(b);
    assert.equal(flags.desktop.effectiveMode, "grid");
    assert.equal(flags.tablet.effectiveMode, "slider");
    assert.equal(flags.mobile.effectiveMode, "slider");
  });

  it("collapse variant resolves", () => {
    const b = block({
      type: "contentList",
      props: { displaySettings: { layoutMode: "grid" } },
      responsive: {
        mobile: {
          contentOverflow: { mode: "collapse", collapseVariant: "show_more", showMoreLimit: 5 },
        },
      },
    });
    const mobile = resolveContentOverflowForDevice(b, "mobile");
    assert.equal(mobile.effectiveMode, "collapse");
    assert.equal(mobile.collapseVariant, "show_more");
    assert.equal(mobile.showMoreLimit, 5);
  });

  it("contentList list base maps to stack collapse", () => {
    const b = block({
      type: "contentList",
      props: { displaySettings: { layoutMode: "list" } },
    });
    const base = resolveBaseContentOverflow(b);
    assert.equal(base.effectiveMode, "collapse");
    assert.equal(base.collapseVariant, "stack");
  });

  it("statsCounter responsive slider resolves to slider mode", () => {
    const b = block({
      type: "statsCounter",
      props: { layout: "grid" },
      responsive: {
        desktop: { contentOverflow: { mode: "slider", sliderEnabled: true } },
      },
    });
    const desktop = resolveContentOverflowForDevice(b, "desktop");
    assert.equal(desktop.effectiveMode, "slider");
    assert.equal(desktop.sliderEnabled, true);
    const flags = resolveContentOverflowCssFlags(b);
    assert.equal(flags.desktop.effectiveMode, "slider");
  });
});
