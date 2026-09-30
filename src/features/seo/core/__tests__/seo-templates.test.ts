import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SEO_TEMPLATES,
  resolveSeoTemplate,
} from "@/features/seo/core/seo-templates";

describe("resolveSeoTemplate", () => {
  it("replaces Yoast-style variables", () => {
    const result = resolveSeoTemplate("%%postname%% %%sep%% %%sitename%%", {
      postname: "Widget FAQs",
      sep: "|",
      sitename: "Acme",
    });
    assert.equal(result, "Widget FAQs | Acme");
  });

  it("has homepage default pattern", () => {
    assert.match(DEFAULT_SEO_TEMPLATES.home, /%%sitename%%/);
    assert.match(DEFAULT_SEO_TEMPLATES.search, /%%search_phrase%%/);
  });
});
