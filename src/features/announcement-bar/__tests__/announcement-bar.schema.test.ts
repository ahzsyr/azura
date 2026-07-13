import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  announcementBarPropsSchema,
  DEFAULT_ANNOUNCEMENT_BAR_PROPS,
} from "@/features/announcement-bar/announcement-bar.schema";
import {
  parseSiteAnnouncementBarSettings,
  siteAnnouncementBarSchema,
} from "@/features/announcement-bar/site-announcement-bar.schema";
import { normalizeAnnouncementItems } from "@/features/announcement-bar/normalize-announcement-items";

describe("announcement bar schema", () => {
  it("parses empty props with defaults", () => {
    const p = announcementBarPropsSchema.parse({});
    assert.equal(p.variant, "slim");
    assert.equal(p.barTone, "accent");
    assert.equal(p.scrollSpeed, "medium");
    assert.equal(p.items.length, 0);
  });

  it("default block props include seed items", () => {
    assert.equal(DEFAULT_ANNOUNCEMENT_BAR_PROPS.items.length, 5);
    assert.equal(DEFAULT_ANNOUNCEMENT_BAR_PROPS.separator, "◈");
  });

  it("parses site settings with enabled flag", () => {
    const s = siteAnnouncementBarSchema.parse({ enabled: true });
    assert.equal(s.enabled, true);
    assert.equal(s.suppressOnPagesWithBlock, true);
  });

  it("parseSiteAnnouncementBarSettings falls back safely", () => {
    const s = parseSiteAnnouncementBarSettings(null);
    assert.equal(s.enabled, false);
  });
});

describe("normalize announcement items", () => {
  it("uses message when present", () => {
    const lines = normalizeAnnouncementItems([
      {
        id: "1",
        message: "Hello",
        title: "",
        description: "",
        linkUrl: "/x",
        icon: "",
        badge: "",
      },
    ]);
    assert.equal(lines[0]?.message, "Hello");
    assert.equal(lines[0]?.href, "/x");
  });

  it("combines title and description legacy fields", () => {
    const lines = normalizeAnnouncementItems([
      {
        id: "1",
        message: "",
        title: "A",
        description: "B",
        linkUrl: "",
        icon: "",
        badge: "",
      },
    ]);
    assert.equal(lines[0]?.message, "A — B");
  });

  it("resolves suffixed locale fields from block editor", () => {
    const locales = [
      { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr" as const, flag: "🇺🇸", isDefault: true },
      { code: "fr", urlPrefix: "fr", label: "French", htmlLang: "fr", dir: "ltr" as const, flag: "🇫🇷", isDefault: false },
    ];
    const lines = normalizeAnnouncementItems(
      [
        {
          id: "1",
          message: "",
          messageEn: "Security Solutions",
          messageFr: "Solutions de sécurité",
          title: "",
          description: "",
          linkUrl: "",
          icon: "",
          badge: "",
        },
      ],
      { locale: "fr", enabledLocales: locales },
    );
    assert.equal(lines[0]?.message, "Solutions de sécurité");
  });

  it("preserves suffixed item fields through schema parse", () => {
    const parsed = announcementBarPropsSchema.parse({
      items: [{ id: "1", messageEn: "IoT Solutions" }],
    });
    assert.equal((parsed.items[0] as Record<string, unknown>).messageEn, "IoT Solutions");
  });
});
