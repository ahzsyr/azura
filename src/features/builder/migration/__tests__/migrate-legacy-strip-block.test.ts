import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import { migrateLegacyStripBlocks } from "@/features/builder/migration/migrate-legacy-strip-block";
import { DEFAULT_ANNOUNCEMENT_BAR_PROPS } from "@/features/announcement-bar/announcement-bar.schema";

describe("migrateLegacyStripBlocks", () => {
  it("migrates strip-block with corrupted enum fields without throwing", () => {
    const legacy = [
      {
        id: "strip-bad",
        type: "strip-block",
        settings: {
          barTone: "not-a-real-tone",
          direction: "sideways",
          variant: "",
          items: [{ message: "Still works" }],
        },
      },
    ] as unknown as BlockNode[];

    const blocks = migrateLegacyStripBlocks(legacy);
    assert.equal(blocks[0]?.type, "announcementBar");
    assert.equal(blocks[0]?.version, "2.0");
    const settings = blocks[0]?.settings as { barTone?: string; items?: unknown[] };
    assert.equal(settings.barTone, DEFAULT_ANNOUNCEMENT_BAR_PROPS.barTone);
    assert.ok(Array.isArray(settings.items) && settings.items.length > 0);
  });
});
