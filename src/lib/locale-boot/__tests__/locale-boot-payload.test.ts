import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLocaleBootPayload,
  serializeLocaleBootPayload,
} from "@/lib/locale-boot/locale-boot-payload";
import { DEFAULT_SITE_PRELOADER } from "@/features/preloader/site-preloader.schema";
import { DEFAULT_PAGE_TRANSITIONS } from "@/features/preloader/page-transitions.schema";

describe("locale boot payload", () => {
  it("serializes safe JSON without executable script breaks", () => {
    const payload = buildLocaleBootPayload({
      lang: "en",
      dir: "ltr",
      locale: "en",
      htmlAttributes: { "data-preset-id": "telecom" },
      primaryColor: "#6366f1",
      accentColor: "#818cf8",
      pageTransitionSettings: DEFAULT_PAGE_TRANSITIONS,
      preloaderActive: true,
      preloaderMaxMs: 4000,
    });
    const json = serializeLocaleBootPayload(payload);
    assert.doesNotMatch(json, /</);
    assert.match(json, /"primary":"#6366f1"/);
  });

  it("includes page transition attrs and preloader flags", () => {
    const payload = buildLocaleBootPayload({
      lang: "ar",
      dir: "rtl",
      locale: "ar",
      htmlAttributes: {},
      pageTransitionSettings: {
        ...DEFAULT_PAGE_TRANSITIONS,
        enabled: true,
        preset: "zoom",
        durationMs: 300,
      },
      preloaderActive: false,
      preloaderMaxMs: DEFAULT_SITE_PRELOADER.maxDurationMs,
    });
    assert.equal(payload.dir, "rtl");
    assert.equal(payload.preloaderActive, false);
    assert.equal(payload.pageTransition.attrs["data-page-transition"], "zoom");
  });
});
