import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compositionService } from "@/features/layout-engine/composition.service";
import { withTopInStackOrder } from "@/features/layout-engine/layout-registry";
import {
  getLayoutShellAttributes,
  resolveLayoutMaxWidth,
} from "@/features/layout-engine/layout-shell-attrs";
import { getEditorRegionOrder } from "@/features/layout-engine/types";
import {
  getCompositionRegionLabel,
  getLayoutDisplayName,
  getLayoutPreviewColumns,
  getLayoutPreviewRegions,
} from "@/features/layout-engine/composition-editor-helpers";
import type { Composition } from "@/features/layout-engine/types";

describe("compositionService.load legacy upgrade", () => {
  it("adds empty top region for legacy composition JSON", () => {
    const legacy = {
      version: 1,
      layout: {
        type: "full",
        spacing: { gap: "md", maxWidth: "page", container: "boxed" },
        regions: { primary: { sticky: false } },
      },
      regions: {
        primary: [{ id: "b1", type: "richText", props: {}, children: [] }],
        asideStart: [],
        asideEnd: [],
      },
      hiddenRegions: {
        primary: [],
        asideStart: [],
        asideEnd: [],
      },
      metadata: {},
    };

    const loaded = compositionService.load({ composition: legacy });
    assert.deepEqual(loaded.regions.top, []);
    assert.deepEqual(loaded.hiddenRegions.top, []);
    assert.equal(loaded.layout.topSection?.enabled, false);
    assert.equal(loaded.layout.topSection?.width, "boxed");
    assert.equal(loaded.layout.stickyScroll, "document");
  });

  it("preserves editorial display flags in composition metadata", () => {
    const source = compositionService.createEmpty();
    source.metadata = { showAuthor: false, showPublishedAt: true };
    const saved = compositionService.save(source);
    const loaded = compositionService.load({ composition: saved.composition });
    assert.equal(loaded.metadata.showAuthor, false);
    assert.equal(loaded.metadata.showPublishedAt, true);
  });

  it("upgrades legacy blocks array into primary region", () => {
    const loaded = compositionService.load({
      blocks: [{ id: "legacy", type: "richText", props: {}, children: [] }],
    });
    assert.equal(loaded.regions.primary.length, 1);
    assert.deepEqual(loaded.regions.top, []);
  });
});

describe("getLayoutShellAttributes", () => {
  const base = compositionService.createEmpty();

  function withMaxWidth(maxWidth: Composition["layout"]["spacing"]["maxWidth"]) {
    return compositionService.validate({
      ...base,
      layout: {
        ...base.layout,
        spacing: { ...base.layout.spacing, maxWidth },
      },
    });
  }

  it("maps max width presets to shell attributes", () => {
    assert.equal(getLayoutShellAttributes(withMaxWidth("full")).maxWidth, "full");
    assert.equal(getLayoutShellAttributes(withMaxWidth("page")).maxWidth, "page");
    assert.equal(getLayoutShellAttributes(withMaxWidth("wide")).maxWidth, "wide");
    assert.equal(getLayoutShellAttributes(withMaxWidth("narrow")).maxWidth, "narrow");
    assert.equal(resolveLayoutMaxWidth("custom"), "page");
    assert.equal(resolveLayoutMaxWidth(undefined), "page");
  });

  it("reflects top section settings", () => {
    const withTop = compositionService.validate({
      ...base,
      layout: {
        ...base.layout,
        topSection: { enabled: true, width: "full" },
      },
    });
    const attrs = getLayoutShellAttributes(withTop);
    assert.equal(attrs.topEnabled, true);
    assert.equal(attrs.topWidth, "full");
  });

  it("defaults sticky scroll to document", () => {
    assert.equal(getLayoutShellAttributes(base).stickyScroll, "document");
  });
});

describe("withTopInStackOrder", () => {
  it("prepends top when enabled and not already present", () => {
    assert.deepEqual(withTopInStackOrder(["asideStart", "primary"], true), [
      "top",
      "asideStart",
      "primary",
    ]);
  });

  it("leaves order unchanged when top disabled", () => {
    assert.deepEqual(withTopInStackOrder(["primary", "asideEnd"], false), [
      "primary",
      "asideEnd",
    ]);
  });
});

describe("getEditorRegionOrder", () => {
  it("places top first when top section is enabled", () => {
    const layout = compositionService.createEmpty().layout;
    const withTop = {
      ...layout,
      topSection: { enabled: true, width: "boxed" as const },
    };
    assert.deepEqual(getEditorRegionOrder(withTop, ["asideStart", "primary"]), [
      "top",
      "asideStart",
      "primary",
    ]);
  });
});

describe("RTL page layout helpers", () => {
  it("mirrors sidebar labels and layout names in RTL", () => {
    assert.equal(getCompositionRegionLabel("asideStart", false), "Left Sidebar");
    assert.equal(getCompositionRegionLabel("asideStart", true), "Right Sidebar");
    assert.equal(getCompositionRegionLabel("asideEnd", false), "Right Sidebar");
    assert.equal(getCompositionRegionLabel("asideEnd", true), "Left Sidebar");
    assert.equal(getLayoutDisplayName("left-sidebar", false), "Left Sidebar");
    assert.equal(getLayoutDisplayName("left-sidebar", true), "Right Sidebar");
    assert.equal(getLayoutDisplayName("right-sidebar", false), "Right Sidebar");
    assert.equal(getLayoutDisplayName("right-sidebar", true), "Left Sidebar");
    assert.equal(getLayoutDisplayName("full", true), "Full Width");
  });

  it("reverses preview tracks and regions together so widths stay with regions", () => {
    assert.equal(getLayoutPreviewColumns("left-sidebar", false), "1fr 2fr");
    assert.equal(getLayoutPreviewColumns("left-sidebar", true), "2fr 1fr");
    assert.equal(getLayoutPreviewColumns("right-sidebar", false), "2fr 1fr");
    assert.equal(getLayoutPreviewColumns("right-sidebar", true), "1fr 2fr");
    assert.deepEqual(getLayoutPreviewRegions(["asideStart", "primary"], false), [
      "asideStart",
      "primary",
    ]);
    assert.deepEqual(getLayoutPreviewRegions(["asideStart", "primary"], true), [
      "primary",
      "asideStart",
    ]);
    assert.deepEqual(
      getLayoutPreviewRegions(["asideStart", "primary", "asideEnd"], true),
      ["asideEnd", "primary", "asideStart"],
    );
  });
});
