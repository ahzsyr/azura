import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  composeDocumentTitle,
  stripRedundantSiteSuffixes,
  titleIncludesSiteName,
} from "@/lib/compose-document-title";

describe("composeDocumentTitle", () => {
  it("appends site name once when missing", () => {
    assert.equal(composeDocumentTitle("Home", "BRT TRADING"), "Home | BRT TRADING");
  });

  it("does not append when brand already present", () => {
    assert.equal(
      composeDocumentTitle("BRT TRADING - Home", "BRT TRADING"),
      "BRT TRADING - Home",
    );
  });

  it("strips stacked brand suffixes from meta + prior appends", () => {
    const raw =
      "BRT TRADING - Home | B R T Trading LLC — Solutions | BRT TRADING | BRT TRADING";
    assert.equal(composeDocumentTitle(raw, "BRT TRADING"), "BRT TRADING - Home");
  });

  it("strips trailing site suffixes before compose", () => {
    assert.equal(
      stripRedundantSiteSuffixes(
        "Contact | B R T Trading LLC — Solutions | BRT TRADING",
        "BRT TRADING",
      ),
      "Contact",
    );
  });

  it("matches spaced brand variants", () => {
    assert.equal(
      titleIncludesSiteName("About | B R T Trading LLC", "BRT TRADING"),
      true,
    );
  });

  it("returns site name when page title empty", () => {
    assert.equal(composeDocumentTitle("", "BRT TRADING"), "BRT TRADING");
  });
});
