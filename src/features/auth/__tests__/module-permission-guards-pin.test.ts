import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("Module mutation asserts call requireModulePermission after ingress", () => {
  for (const file of [
    "src/modules/documentation/module-profile.ts",
    "src/modules/status-page/module-profile.ts",
    "src/modules/marketing/feature-flags.ts",
    "src/modules/advanced-seo/guard.ts",
  ]) {
    const src = read(file);
    assert.match(src, /requireModulePermission/, `${file} must enforce Module ACL`);
  }
});

test("admin layouts require Module read permission", () => {
  assert.match(read("src/app/admin/(dashboard)/documentation/layout.tsx"), /assertDocumentationReadAllowed/);
  assert.match(read("src/app/admin/(dashboard)/status/layout.tsx"), /assertStatusPageReadAllowed/);
  assert.match(read("src/app/admin/(dashboard)/marketing/layout.tsx"), /assertMarketingReadAllowed/);
});
