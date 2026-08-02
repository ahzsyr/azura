import assert from "node:assert/strict";
import test from "node:test";
import { parseSitePopupsSettings } from "@/features/popups/site-popups.schema";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";
import { matchesPageTargeting } from "@/features/popups/lib/popup-targeting";
import { sanitizePopupHtml } from "@/features/popups/lib/sanitize-html";

test("parseSitePopupsSettings returns defaults for invalid input", () => {
  const settings = parseSitePopupsSettings(null);
  assert.equal(settings.enabled, false);
  assert.deepEqual(settings.items, []);
});

test("resolveSitePopups filters active items when disabled", () => {
  const resolved = resolveSitePopups({
    sitePopups: {
      enabled: false,
      items: [{ id: "a", name: "Test", enabled: true }],
    },
  });
  assert.equal(resolved.activeItems.length, 0);
});

test("matchesPageTargeting supports include patterns", () => {
  const match = matchesPageTargeting(
    { mode: "include", paths: ["/products*"] },
    "/products/widget",
  );
  assert.equal(match, true);
});

test("sanitizePopupHtml strips scripts", () => {
  const clean = sanitizePopupHtml('<p>Hello</p><script>alert(1)</script>');
  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("Hello"), true);
});
