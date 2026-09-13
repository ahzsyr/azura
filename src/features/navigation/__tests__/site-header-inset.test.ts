import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  boxedHeaderTopGapPx,
  resolveBoxedHeaderTopGapPx,
  resolveHeaderInsetActive,
  resolveShrinkScrollCompact,
  SITE_CONTENT_TOP_INSET_CSS,
} from "@/features/navigation/site-header-inset";

describe("site-header-inset", () => {
  it("detects boxed top gap", () => {
    assert.equal(boxedHeaderTopGapPx("boxed-compact"), 12);
    assert.equal(boxedHeaderTopGapPx("normal-compact"), 0);
  });

  it("resolveBoxedHeaderTopGapPx respects mobile sticky-boxed settings", () => {
    // Boxed off + auto-remove default → flush
    assert.equal(
      resolveBoxedHeaderTopGapPx({ headerStyle: "boxed-compact", isMobile: true }),
      0
    );
    // Boxed off + auto-remove off → keep gap
    assert.equal(
      resolveBoxedHeaderTopGapPx({
        headerStyle: "boxed-compact",
        isMobile: true,
        mobileBoxedSticky: false,
        mobileFlushTop: false,
      }),
      12
    );
    // Boxed on keeps gap regardless of flush setting
    assert.equal(
      resolveBoxedHeaderTopGapPx({
        headerStyle: "boxed-compact",
        isMobile: true,
        mobileBoxedSticky: true,
        mobileFlushTop: true,
      }),
      12
    );
    assert.equal(
      resolveBoxedHeaderTopGapPx({
        headerStyle: "boxed-compact",
        isMobile: true,
        mobileBoxedSticky: true,
        mobileFlushTop: false,
      }),
      12
    );
    assert.equal(
      resolveBoxedHeaderTopGapPx({
        headerStyle: "boxed-compact",
        isMobile: false,
        mobileBoxedSticky: false,
        mobileFlushTop: true,
      }),
      12
    );
    assert.equal(
      resolveBoxedHeaderTopGapPx({
        headerStyle: "normal-compact",
        isMobile: true,
        mobileBoxedSticky: true,
        mobileFlushTop: false,
      }),
      0
    );
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
        mode: "shrink-scroll",
        workspaceOverlay: false,
        blockOverlay: false,
        isSticking: true,
      }),
      false
    );
    assert.equal(
      resolveHeaderInsetActive({
        mode: "shrink-scroll",
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

  it("resolveShrinkScrollCompact uses a top-of-page hysteresis window", () => {
    assert.equal(resolveShrinkScrollCompact(0, false), false);
    assert.equal(resolveShrinkScrollCompact(20, false), false);
    assert.equal(resolveShrinkScrollCompact(21, false), true);
    assert.equal(resolveShrinkScrollCompact(400, true), true);
    assert.equal(resolveShrinkScrollCompact(10, true), true);
    assert.equal(resolveShrinkScrollCompact(4, true), false);
    assert.equal(resolveShrinkScrollCompact(0, true), false);
  });
});
