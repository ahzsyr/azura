import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAnyComingSoonPath,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
  resolveComingSoonCanonicalPath,
} from "@/features/coming-soon/coming-soon.middleware";

const LOCALES = ["en", "ar"];

test("isComingSoonPublicPath matches /coming-soon routes", () => {
  assert.equal(isComingSoonPublicPath("/coming-soon"), true);
  assert.equal(isComingSoonPublicPath("/coming-soon/"), true);
  assert.equal(isComingSoonPublicPath("/en"), false);
});

test("isComingSoonExemptPage exempts admin, setup, preview, and coming soon", () => {
  assert.equal(isComingSoonExemptPage("/coming-soon", false, LOCALES), true);
  assert.equal(isComingSoonExemptPage("/admin", false, LOCALES), true);
  assert.equal(isComingSoonExemptPage("/admin/dashboard", false, LOCALES), true);
  assert.equal(isComingSoonExemptPage("/setup", false, LOCALES), true);
  assert.equal(isComingSoonExemptPage("/preview", true, LOCALES), true);
  assert.equal(isComingSoonExemptPage("/preview/page", true, LOCALES), true);
});

test("isComingSoonExemptPage does not exempt public storefront paths", () => {
  assert.equal(isComingSoonExemptPage("/", false, LOCALES), false);
  assert.equal(isComingSoonExemptPage("/en", false, LOCALES), false);
  assert.equal(isComingSoonExemptPage("/en/shop", false, LOCALES), false);
});

test("resolveComingSoonCanonicalPath maps locale-prefixed coming soon URLs", () => {
  assert.equal(resolveComingSoonCanonicalPath("/en/coming-soon", LOCALES), "/coming-soon");
  assert.equal(resolveComingSoonCanonicalPath("/ar/coming-soon", LOCALES), "/coming-soon");
  assert.equal(resolveComingSoonCanonicalPath("/coming-soon", LOCALES), null);
  assert.equal(resolveComingSoonCanonicalPath("/en/shop", LOCALES), null);
});

test("isAnyComingSoonPath matches canonical and locale-prefixed coming soon URLs", () => {
  assert.equal(isAnyComingSoonPath("/coming-soon", LOCALES), true);
  assert.equal(isAnyComingSoonPath("/en/coming-soon", LOCALES), true);
  assert.equal(isAnyComingSoonPath("/en/shop", LOCALES), false);
});
