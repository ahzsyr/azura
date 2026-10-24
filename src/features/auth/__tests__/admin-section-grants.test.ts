import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adminHasSection,
  filterGroupsBySectionGrants,
  isAdminPathGranted,
  parseAdminSectionGrants,
} from "@/features/auth/admin-section-grants";

describe("admin section grants", () => {
  it("treats null as every section for an admin", () => {
    assert.equal(parseAdminSectionGrants(null), null);
    assert.equal(adminHasSection("ADMIN", null, "seo"), true);
  });

  it("hides a group that was not granted", () => {
    const grants = parseAdminSectionGrants(["content", "unknown"]);
    assert.deepEqual(grants, ["content"]);
    const visible = filterGroupsBySectionGrants(
      [{ id: "content" }, { id: "seo" }, { id: "settings" }],
      grants,
    );
    assert.deepEqual(
      visible.map((group) => group.id),
      ["content"],
    );
    assert.equal(
      isAdminPathGranted({
        pathname: "/admin/seo",
        role: "ADMIN",
        grants,
        groupId: "seo",
      }),
      false,
    );
  });

  it("keeps dashboard home and own account settings open", () => {
    const grants = ["content"];
    assert.equal(
      isAdminPathGranted({ pathname: "/admin", role: "ADMIN", grants, groupId: null }),
      true,
    );
    assert.equal(
      isAdminPathGranted({
        pathname: "/admin/settings/account",
        role: "ADMIN",
        grants,
        groupId: "settings",
      }),
      true,
    );
  });

  it("lets a super admin open every section", () => {
    assert.equal(adminHasSection("SUPER_ADMIN", ["content"], "system"), true);
  });
});
