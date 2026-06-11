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
        messageEn: "",
        messageAr: "",
        title: "",
        titleEn: "",
        titleAr: "",
        description: "",
        descriptionEn: "",
        descriptionAr: "",
        linkUrl: "/x",
        icon: "",
        badge: "",
        badgeEn: "",
        badgeAr: "",
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
        messageEn: "",
        messageAr: "",
        title: "A",
        titleEn: "",
        titleAr: "",
        description: "B",
        descriptionEn: "",
        descriptionAr: "",
        linkUrl: "",
        icon: "",
        badge: "",
        badgeEn: "",
        badgeAr: "",
      },
    ]);
    assert.equal(lines[0]?.message, "A — B");
  });
});
