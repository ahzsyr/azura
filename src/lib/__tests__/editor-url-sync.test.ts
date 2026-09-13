import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEditorRedirectQuery,
  buildPostEditorPath,
} from "@/lib/editor-url-sync";
import { blockOwnsSectionSpacing } from "@/features/builder/lib/block-spacing";
import { resolveEditorPublishStatus } from "@/hooks/use-editor-publish-status";

describe("buildPostEditorPath", () => {
  it("places query params before hash for content tab", () => {
    const path = buildPostEditorPath("post-1", "content", "block-a", "style");
    assert.equal(path, "/admin/posts/post-1?block=block-a&inspector=style#content");
  });

  it("includes region param on content tab", () => {
    const path = buildPostEditorPath("post-1", "content", "block-a", "style", "asideStart");
    assert.equal(
      path,
      "/admin/posts/post-1?block=block-a&inspector=style&region=asideStart#content",
    );
  });

  it("omits query when not on content tab", () => {
    const path = buildPostEditorPath("post-1", "general", "block-a", "style");
    assert.equal(path, "/admin/posts/post-1#general");
  });
});

describe("buildEditorRedirectQuery", () => {
  it("includes region in query string", () => {
    const qs = buildEditorRedirectQuery({
      tab: "blocks",
      block: "b1",
      inspector: "style",
      region: "asideStart",
    });
    assert.equal(qs, "tab=blocks&block=b1&inspector=style&region=asideStart");
  });
});

describe("blockOwnsSectionSpacing", () => {
  it("returns true when per-side padding preset is set", () => {
    assert.equal(blockOwnsSectionSpacing({ paddingTopPreset: "compact" }), true);
  });

  it("returns false when styles are empty", () => {
    assert.equal(blockOwnsSectionSpacing({}), false);
    assert.equal(blockOwnsSectionSpacing(undefined), false);
  });
});

describe("resolveEditorPublishStatus", () => {
  it("marks draft entities as pending", () => {
    assert.equal(resolveEditorPublishStatus("DRAFT"), "pending");
  });

  it("marks published visible entities as live", () => {
    assert.equal(resolveEditorPublishStatus("PUBLISHED", true), "live");
  });

  it("marks published hidden entities as pending", () => {
    assert.equal(resolveEditorPublishStatus("PUBLISHED", false), "pending");
  });
});
