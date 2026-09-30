import assert from "node:assert/strict";
import test from "node:test";
import { parseSitePopupsSettings } from "@/features/popups/site-popups.schema";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";
import { matchesPageTargeting } from "@/features/popups/lib/popup-targeting";
import { sanitizePopupHtml } from "@/features/popups/lib/sanitize-html";
import { createDefaultPopupItem, popupItemSchema } from "@/features/popups/popup.schema";
import { patchPopupItem } from "@/features/popups/admin/lib/patch-popup-item";
import { getPopupAdminStatus } from "@/features/popups/admin/lib/popup-status";
import { getPopupDesignStyle } from "@/features/popups/lib/popup-styles";

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

test("updatedAt is optional admin metadata with empty default", () => {
  const item = popupItemSchema.parse({ id: "meta-1", name: "Meta" });
  assert.equal(item.updatedAt, "");
  const withStamp = createDefaultPopupItem({ id: "meta-2" });
  assert.ok(withStamp.updatedAt.length > 0);
});

test("patchPopupItem preserves blocks and bodyHtml when omitted", () => {
  const item = createDefaultPopupItem({
    id: "preserve-1",
    content: {
      title: "Hello",
      subtitle: "",
      body: "Body",
      bodyHtml: "<p>Keep me</p>",
      imageUrl: "",
      imageAlt: "",
      videoUrl: "",
      primaryCta: { label: "Go", href: "/", openInNewTab: false, variant: "primary" },
      secondaryCta: { label: "", href: "", openInNewTab: false, variant: "secondary" },
      blocks: [
        {
          id: "b1",
          type: "text",
          text: "Block text",
          html: "",
          imageUrl: "",
          imageAlt: "",
          videoUrl: "",
          heightPx: 16,
        },
      ],
    },
  });

  const next = patchPopupItem(item, {
    content: { title: "Updated" },
  });

  assert.equal(next.content.title, "Updated");
  assert.equal(next.content.bodyHtml, "<p>Keep me</p>");
  assert.equal(next.content.blocks.length, 1);
  assert.equal(next.content.blocks[0]?.text, "Block text");
  assert.equal(next.content.primaryCta.label, "Go");
});

test("patchPopupItem merges nested CTA without wiping sibling fields", () => {
  const item = createDefaultPopupItem({ id: "cta-1" });
  item.content.primaryCta = {
    label: "Shop",
    href: "/shop",
    openInNewTab: true,
    variant: "primary",
  };

  const next = patchPopupItem(item, {
    content: { primaryCta: { label: "Buy now" } },
  });

  assert.equal(next.content.primaryCta.label, "Buy now");
  assert.equal(next.content.primaryCta.href, "/shop");
  assert.equal(next.content.primaryCta.openInNewTab, true);
});

test("getPopupAdminStatus derives draft scheduled and active", () => {
  const draft = createDefaultPopupItem({ id: "s1", enabled: false });
  assert.equal(getPopupAdminStatus(draft), "draft");

  const now = new Date("2026-06-01T00:00:00.000Z");
  const scheduled = createDefaultPopupItem({
    id: "s2",
    enabled: true,
    schedule: {
      enabled: true,
      startAt: "2026-07-01T00:00:00.000Z",
      endAt: "",
    },
  });
  assert.equal(getPopupAdminStatus(scheduled, now), "scheduled");

  const active = createDefaultPopupItem({ id: "s3", enabled: true });
  assert.equal(getPopupAdminStatus(active, now), "active");
});

test("getPopupDesignStyle sets --popup-accent with primary fallback", () => {
  const withAccent = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    accentColor: "#F75B28",
  });
  assert.equal(withAccent["--popup-accent" as keyof typeof withAccent], "#F75B28");

  const withoutAccent = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    accentColor: "",
  });
  assert.equal(
    withoutAccent["--popup-accent" as keyof typeof withoutAccent],
    "var(--primary)",
  );
});

test("new design defaults favor premium neutral surfaces", () => {
  const design = createDefaultPopupItem().design;
  assert.equal(design.borderRadius, 22);
  assert.equal(design.maxWidth, 520);
  assert.equal(design.padding, 24);
  assert.equal(design.animationDurationMs, 240);
  assert.ok(design.boxShadow.includes("24px"));
});

test("getPopupDesignStyle uses neutral border fallback not accent", () => {
  const style = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    borderColor: "",
    accentColor: "#F75B28",
  });
  assert.equal(style.borderColor?.includes("foreground"), true);
  assert.equal(style.borderColor?.includes("popup-accent"), false);
});

test("getPopupDesignStyle infers dark text on light hardcoded backgrounds", () => {
  const style = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    backgroundColor: "#ffffff",
    textColor: "",
  });
  assert.equal(style.color, "#0d0f14");
});

test("getPopupDesignStyle infers light text on dark hardcoded backgrounds", () => {
  const style = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    backgroundColor: "#12141a",
    textColor: "",
  });
  assert.equal(style.color, "#f5f5f7");
});

test("getPopupDesignStyle ignores orphan textColor so dark mode stays readable", () => {
  const style = getPopupDesignStyle({
    ...createDefaultPopupItem().design,
    backgroundColor: "",
    textColor: "#0d0f14",
  });
  assert.equal(style.color, "var(--foreground)");
});

test("getPopupDesignStyle forces theme foreground in dark mode when glass replaces light backgrounds", () => {
  const previous = globalThis.document;
  const root = {
    classList: { contains: (name: string) => name === "dark" },
    getAttribute: (name: string) => (name === "data-glass-effect" ? "liquid" : null),
  };
  // Minimal document stub for theme/glass detection in getPopupDesignStyle
  (globalThis as { document?: unknown }).document = {
    documentElement: root,
  };

  try {
    const style = getPopupDesignStyle({
      ...createDefaultPopupItem().design,
      backgroundColor: "#ffffff",
      textColor: "#0d0f14",
    });
    assert.equal(style.color, "var(--foreground)");
    assert.equal(style.backgroundColor, undefined);
  } finally {
    if (previous === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = previous;
    }
  }
});

test("legacy sitePopups JSON round-trips without requiring updatedAt", () => {
  const settings = parseSitePopupsSettings({
    enabled: true,
    items: [
      {
        id: "legacy-1",
        name: "Legacy",
        enabled: true,
        type: "modal",
        content: {
          title: "Sale",
          bodyHtml: "<strong>Hi</strong>",
          blocks: [
            {
              id: "blk",
              type: "image",
              imageUrl: "/x.png",
            },
          ],
        },
      },
    ],
  });

  assert.equal(settings.items.length, 1);
  assert.equal(settings.items[0]?.updatedAt, "");
  assert.equal(settings.items[0]?.content.bodyHtml, "<strong>Hi</strong>");
  assert.equal(settings.items[0]?.content.blocks[0]?.type, "image");
  assert.equal(settings.items[0]?.closeAction, "dismiss");
  assert.equal(settings.items[0]?.autoHideMs, 0);
});

test("closeAction and autoHideMs parse from settings", () => {
  const settings = parseSitePopupsSettings({
    enabled: true,
    items: [
      {
        id: "auto-1",
        name: "Timed",
        closeAction: "minimize",
        autoHideMs: 12000,
      },
    ],
  });
  assert.equal(settings.items[0]?.closeAction, "minimize");
  assert.equal(settings.items[0]?.autoHideMs, 12000);
});

test("createDefaultPopupItem uses dismiss and no auto-hide", () => {
  const item = createDefaultPopupItem({ id: "def-1" });
  assert.equal(item.closeAction, "dismiss");
  assert.equal(item.autoHideMs, 0);
});
