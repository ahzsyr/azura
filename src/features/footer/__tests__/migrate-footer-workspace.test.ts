import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateFooterWorkspace } from "@/features/footer/defaults";
import { footerWorkspaceSchema } from "@/schemas/footer";

describe("migrateFooterWorkspace", () => {
  it("migrates v1 workspace to v2 with responsive defaults", () => {
    const v1 = {
      version: 1,
      layout: "grid",
      gridColumns: 4,
      design: { linkStyle: "muted" },
      columns: [{ id: "brand", type: "brand", enabled: true }],
      copyright: { showBar: true },
    };

    const migrated = migrateFooterWorkspace(v1);
    assert.equal(migrated.version, 2);
    assert.equal(migrated.responsive.desktop, 4);
    assert.equal(migrated.responsive.mobile, 1);
    assert.ok(footerWorkspaceSchema.parse(migrated));
  });

  it("normalizes empty input to defaults", () => {
    const migrated = migrateFooterWorkspace(null);
    assert.equal(migrated.version, 2);
    assert.ok(migrated.columns.length > 0);
  });
});
