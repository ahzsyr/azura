import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLocaleSwitchHref,
  getNeutralPathnameForSwitch,
  localePathFromPrefix,
  stripAnyLocalePrefix,
  stripCurrentLocalePrefix,
  normalizeStackedLocalePathname,
  switchLocalePath,
} from "../url-helpers";
import { resolvePrefixToCode } from "../locale-config";

const PREFIXES = ["en", "ar", "id"];

describe("stripCurrentLocalePrefix", () => {
  it("strips only the given prefix", () => {
    assert.equal(stripCurrentLocalePrefix("/en/packages/foo", "en"), "/packages/foo");
    assert.equal(stripCurrentLocalePrefix("/en/packages/foo", "ar"), "/en/packages/foo");
  });
});

describe("getNeutralPathnameForSwitch", () => {
  it("preserves slug that matches a locale code", () => {
    assert.equal(getNeutralPathnameForSwitch("/en/id", "en", PREFIXES), "/id");
  });

  it("unwinds stacked locale prefixes", () => {
    assert.equal(getNeutralPathnameForSwitch("/en/ar/id", "ar", PREFIXES), "/id");
  });
});

describe("stripAnyLocalePrefix", () => {
  it("strips known prefix and keeps slug path", () => {
    assert.equal(stripAnyLocalePrefix("/en/packages/summer", ["en", "ar"]), "/packages/summer");
  });

  it("returns root when only prefix", () => {
    assert.equal(stripAnyLocalePrefix("/ar", ["en", "ar"]), "/");
  });
});

describe("switchLocalePath", () => {
  it("preserves slug when switching locale", () => {
    assert.equal(
      switchLocalePath("/en/packages/summer-2026", "en", "ar", ["en", "ar"]),
      "/ar/packages/summer-2026"
    );
  });

  it("switches en to ar on CMS slug id without stacking", () => {
    assert.equal(switchLocalePath("/en/id", "en", "ar", PREFIXES), "/ar/id");
  });

  it("switches en to id locale preserving slug segment", () => {
    assert.equal(switchLocalePath("/en/id", "en", "id", PREFIXES), "/id/id");
  });

  it("repairs corrupted stacked path", () => {
    assert.equal(switchLocalePath("/en/ar/id", "ar", "ar", PREFIXES), "/ar/id");
  });

  it("works from locale-neutral pathname", () => {
    assert.equal(
      switchLocalePath("/packages/summer-2026", "en", "fr", ["en", "ar", "fr"]),
      "/fr/packages/summer-2026"
    );
  });
});

describe("localePathFromPrefix", () => {
  it("prefixes neutral paths", () => {
    assert.equal(localePathFromPrefix("/about", "en", ["en", "ar"]), "/en/about");
  });

  it("does not double-prefix paths that already start with the target locale", () => {
    assert.equal(localePathFromPrefix("/ar", "ar"), "/ar");
    assert.equal(localePathFromPrefix("/ar/products/alfa-tube-e4g", "ar"), "/ar/products/alfa-tube-e4g");
  });
});

describe("buildLocaleSwitchHref", () => {
  it("appends query string", () => {
    assert.equal(
      buildLocaleSwitchHref("/packages/foo", "ar", "tab=details"),
      "/ar/packages/foo?tab=details"
    );
  });
});

describe("normalizeStackedLocalePathname", () => {
  it("redirects deep stacked paths preserving slug", () => {
    assert.equal(normalizeStackedLocalePathname("/en/id/ar", PREFIXES), "/id/ar");
    assert.equal(normalizeStackedLocalePathname("/en/ar/about", PREFIXES), "/ar/about");
    assert.equal(normalizeStackedLocalePathname("/en/id/ar/extra", PREFIXES), "/id/ar/extra");
  });

  it("redirects stacked locale root /en/ar to /ar even when ar is not yet in prefix cache", () => {
    assert.equal(normalizeStackedLocalePathname("/en/ar", ["en"]), "/ar");
  });

  it("redirects stacked locale root /en/ar to /ar", () => {
    assert.equal(normalizeStackedLocalePathname("/en/ar", PREFIXES), "/ar");
  });

  it("redirects duplicate same-locale root to a single locale", () => {
    assert.equal(normalizeStackedLocalePathname("/ar/ar", PREFIXES), "/ar");
  });

  it("leaves ambiguous two-segment locale+slug URLs unchanged", () => {
    assert.equal(normalizeStackedLocalePathname("/en/id", PREFIXES), null);
  });

  it("leaves valid single-locale URLs unchanged", () => {
    assert.equal(normalizeStackedLocalePathname("/en/about", PREFIXES), null);
    assert.equal(normalizeStackedLocalePathname("/ar/id", PREFIXES), null);
    assert.equal(normalizeStackedLocalePathname("/en", PREFIXES), null);
  });
});

describe("resolvePrefixToCode", () => {
  const locales = [
    {
      code: "en-gb",
      urlPrefix: "en",
      label: "English",
      htmlLang: "en-GB",
      dir: "ltr" as const,
      flag: "🇬🇧",
      isDefault: true,
    },
    {
      code: "ar",
      urlPrefix: "ar",
      label: "Arabic",
      htmlLang: "ar",
      dir: "rtl" as const,
      flag: "🇸🇦",
      isDefault: false,
    },
  ];

  it("maps url prefix to message code", () => {
    assert.equal(resolvePrefixToCode("en", locales), "en-gb");
    assert.equal(resolvePrefixToCode("ar", locales), "ar");
  });
});
