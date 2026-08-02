import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectFooterTranslationRefs } from "@/features/footer/footer-translation-refs";
import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import type { FooterWorkspace } from "@/features/footer/types";

describe("collectFooterTranslationRefs", () => {
  it("includes footer, columns with heading/body, and link entities", () => {
    const base = createDefaultFooterWorkspace();
    const ws: FooterWorkspace = {
      ...base,
      columns: [
        {
          id: "col-1",
          type: "menu",
          title: "Links",
          enabled: true,
          menuSource: "custom",
          links: [{ label: "Privacy", href: "/privacy" }],
        },
      ],
    };

    const refs = collectFooterTranslationRefs(ws);
    assert.ok(refs.some((r) => r.entityType === "Footer"));
    assert.ok(refs.some((r) => r.entityType === "FooterColumn" && r.entityId));
    assert.ok(refs.some((r) => r.entityType === "FooterLink"));
    assert.equal(refs.length, 3);
  });
});
