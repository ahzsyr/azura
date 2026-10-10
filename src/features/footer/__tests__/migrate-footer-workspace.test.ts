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
    const menu = migrated.columns.find((col) => col.type === "menu");
    const hrefs = new Set((menu?.links ?? []).map((link) => link.href));
    assert.ok(hrefs.has("/blog"));
    assert.ok(hrefs.has("/contact"));
  });

  it("keeps custom contact lines when the workspace is saved", () => {
    const migrated = migrateFooterWorkspace({
      version: 2,
      layout: "grid",
      responsive: { desktop: 3, tablet: 2, mobile: 1 },
      columns: [
        {
          id: "contact",
          type: "contact",
          title: "Contact",
          customContactItems: [
            { id: "line-1", type: "phone", label: "Sales", value: "+1 555 0100" },
            { id: "line-2", type: "richtext", value: "<p>Open daily</p>" },
          ],
        },
      ],
    });

    const parsed = footerWorkspaceSchema.parse(migrated);
    const contact = parsed.columns.find((col) => col.id === "contact");
    assert.equal(contact?.customContactItems?.length, 2);
    assert.equal(contact?.customContactItems?.[0]?.value, "+1 555 0100");
    assert.equal(contact?.customContactItems?.[1]?.value, "<p>Open daily</p>");
  });
});
