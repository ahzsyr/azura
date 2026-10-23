import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSafariEdgeTintUA } from "@/lib/theme/safari-chrome-tint";
import { generateThemeBootInlineScript } from "@/lib/theme/theme-boot";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ipadSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/144.0 Mobile/15E148 Safari/605.1.15",
  iphoneEdge:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 EdgiOS/141.0 Mobile/15E148 Safari/605.1.15",
  homeScreenApp:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  desktopChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

describe("isSafariEdgeTintUA", () => {
  it("is on for Safari on iPhone, iPad, and Mac", () => {
    assert.equal(isSafariEdgeTintUA(UA.iphoneSafari), true);
    assert.equal(isSafariEdgeTintUA(UA.ipadSafari), true);
  });

  it("is off for other browsers, home-screen apps, and missing agents", () => {
    for (const ua of [
      UA.iphoneChrome,
      UA.iphoneFirefox,
      UA.iphoneEdge,
      UA.homeScreenApp,
      UA.androidChrome,
      UA.desktopChrome,
      "",
      null,
    ]) {
      assert.equal(isSafariEdgeTintUA(ua), false, String(ua));
    }
  });

  it("boot script re-checks the agent with the same patterns", () => {
    const script = generateThemeBootInlineScript();
    assert.match(script, /data-safari-edge/);
    assert.match(script, /CriOS/);
    assert.match(script, /Version\\\/\[\\d\.\]\+/);
  });

  it("strips only render when data-safari-edge is on", () => {
    const css = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../styles/safari-chrome-tint.css"),
      "utf8",
    );
    assert.match(
      css,
      /html\[data-safari-edge="on"\] #az-safari-chrome-top,\s*html\[data-safari-edge="on"\] #az-safari-chrome-bottom \{\s*display: block;/,
    );
    assert.doesNotMatch(css, /\n  #az-safari-chrome-top,\n  #az-safari-chrome-bottom \{\n    display: block;/);
  });
});
