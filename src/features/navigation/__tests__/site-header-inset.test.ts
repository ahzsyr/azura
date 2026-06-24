import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  boxedHeaderTopGapPx,
  resolveHeaderInsetActive,
  SITE_CONTENT_TOP_INSET_CSS,
} from "@/features/navigation/site-header-inset";

describe("site-header-inset", () => {
  it("detects boxed top gap", () => {
    assert.equal(boxedHeaderTopGapPx("boxed-compact"), 12);
    assert.equal(boxedHeaderTopGapPx("normal-compact"), 0);
  });

  it("site content inset CSS includes header height and content gap", () => {
    assert.match(SITE_CONTENT_TOP_INSET_CSS, /var\(--header-height/);
    assert.match(SITE_CONTENT_TOP_INSET_CSS, /var\(--header-content-gap/);
  });

  it("resolveHeaderInsetActive for fixed and overlay modes", () => {
    assert.equal(
      resolveHeaderInsetActive({
        mode: "fixed-top",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: false,
        usesLayoutSpacer: false,
      }),
      true
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "static",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: false,
      }),
      false
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "sticky",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: false,
      }),
      false
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "sticky",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: true,
        usesLayoutSpacer: false,
      }),
      true
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "sticky",
        workspaceOverlay: true,
        blockOverlay: false,
        isSticking: false,
      }),
      true
    );
  });

  it("mutual exclusion: layout spacer suppresses site-main padding", () => {
    assert.equal(
      resolveHeaderInsetActive({
        mode: "sticky",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: true,
        usesLayoutSpacer: true,
      }),
      false
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "fixed-top",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: false,
        usesLayoutSpacer: true,
      }),
      false
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "sticky",
        workspaceOverlay: true,
        blockOverlay: false,
        isSticking: false,
        usesLayoutSpacer: false,
      }),
      true
    );
  });
});
