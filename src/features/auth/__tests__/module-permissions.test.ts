import assert from "node:assert/strict";
import test from "node:test";
import {
  adminHasModulePermission,
  canonicalModulePermissions,
  listRegisteredModulePermissions,
  parseModulePermissionGrants,
} from "@/features/auth/module-permissions";

test("canonical keys and registry cover the four Modules", () => {
  assert.deepEqual(canonicalModulePermissions("documentation"), [
    "documentation.read",
    "documentation.manage",
  ]);
  const all = listRegisteredModulePermissions();
  assert.ok(all.includes("status-page.read"));
  assert.ok(all.includes("marketing.manage"));
  assert.ok(all.includes("advanced-seo.read"));
  assert.equal(all.length, 8);
});

test("null module grants inherit when section is held", () => {
  assert.equal(
    adminHasModulePermission("ADMIN", ["modules"], null, "documentation", "manage"),
    true,
  );
  assert.equal(
    adminHasModulePermission("ADMIN", ["modules"], null, "status-page", "read"),
    true,
  );
  assert.equal(
    adminHasModulePermission("ADMIN", ["marketing"], null, "documentation", "manage"),
    false,
  );
});

test("explicit empty grants deny even with section", () => {
  assert.equal(
    adminHasModulePermission("ADMIN", ["modules"], [], "documentation", "manage"),
    false,
  );
});

test("manage implies read; read alone does not imply manage", () => {
  assert.equal(
    adminHasModulePermission(
      "ADMIN",
      ["modules"],
      ["documentation.manage"],
      "documentation",
      "read",
    ),
    true,
  );
  assert.equal(
    adminHasModulePermission(
      "ADMIN",
      ["modules"],
      ["documentation.read"],
      "documentation",
      "manage",
    ),
    false,
  );
});

test("SUPER_ADMIN always allowed", () => {
  assert.equal(
    adminHasModulePermission("SUPER_ADMIN", [], [], "marketing", "manage"),
    true,
  );
});

test("parseModulePermissionGrants filters invalid entries", () => {
  assert.equal(parseModulePermissionGrants(null), null);
  assert.deepEqual(parseModulePermissionGrants(["documentation.manage", "nope", "x.read"]), [
    "documentation.manage",
    "x.read",
  ]);
});
