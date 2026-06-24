import test from "node:test";
import assert from "node:assert/strict";
import {
  CACHE_TAGS,
  getHeaderWorkspaceRevalidationTags,
  getWorkspaceTranslationRevalidationTags,
} from "@/services/cache";

test("getWorkspaceTranslationRevalidationTags includes shell and json tags for header entities", () => {
  const tags = getWorkspaceTranslationRevalidationTags("MenuItem", ["en", "ar"]);
  assert.ok(tags.includes(CACHE_TAGS.translations));
  assert.ok(tags.includes("header-workspace"));
  assert.ok(tags.includes(CACHE_TAGS.json("header-workspace")));
  assert.ok(tags.includes("header-flyout-en"));
  assert.ok(tags.includes("header-flyout-ar"));
});

test("getWorkspaceTranslationRevalidationTags includes shell and json tags for footer entities", () => {
  const tags = getWorkspaceTranslationRevalidationTags("FooterLink", ["fr"]);
  assert.ok(tags.includes(CACHE_TAGS.translations));
  assert.ok(tags.includes("footer-workspace"));
  assert.ok(tags.includes(CACHE_TAGS.json("footer-workspace")));
  assert.ok(tags.includes("footer-translations-fr"));
});

test("getWorkspaceTranslationRevalidationTags only adds global translations tag for unrelated entities", () => {
  const tags = getWorkspaceTranslationRevalidationTags("FaqItem", ["en"]);
  assert.deepEqual(tags, [CACHE_TAGS.translations]);
});

test("getHeaderWorkspaceRevalidationTags covers shell and json cache keys", () => {
  const tags = getHeaderWorkspaceRevalidationTags();
  assert.ok(tags.includes("header-workspace"));
  assert.ok(tags.includes(CACHE_TAGS.json("header-workspace")));
  assert.ok(tags.includes(CACHE_TAGS.marketing));
});
