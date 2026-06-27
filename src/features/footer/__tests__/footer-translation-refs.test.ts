import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectFooterTranslationRefs } from "@/features/footer/footer-translation-refs";
import type { FooterWorkspace } from "@/features/footer/types";

describe("collectFooterTranslationRefs", () => {
  it("includes footer, columns, and link entities", () => {
    const ws: FooterWorkspace = {
      layout: "grid",
      gridColumns: 3,
      columns: [
        {
          id: "col-1",
          type: "text",
          title: "About",
          enabled: true,
          links: [{ label: "Privacy", href: "/privacy" }],
        },
      ],
      copyright: { showBar: true, rightsText: "© 2026", suffix: "All rights reserved." },
    };

    const refs = collectFooterTranslationRefs(ws);
    assert.ok(refs.some((r) => r.entityType === "Footer"));
    assert.ok(refs.some((r) => r.entityType === "FooterColumn" && r.entityId));
    assert.ok(refs.some((r) => r.entityType === "FooterLink"));
    assert.equal(refs.length, 3);
  });
});
