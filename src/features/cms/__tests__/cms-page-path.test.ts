import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCmsPageLocalizedPublicPath,
  getCmsPagePublicPath,
  normalizeWiredCmsAbsoluteUrl,
  normalizeWiredCmsPathname,
} from "@/features/cms/cms-page-path";

describe("cms-page-path", () => {
  it("maps wired home to locale root", () => {
    assert.equal(getCmsPagePublicPath("home"), "/");
    assert.equal(getCmsPageLocalizedPublicPath("en", "home"), "/en");
    assert.equal(getCmsPageLocalizedPublicPath("ar", "faqs"), "/ar/faqs");
  });

  it("keeps unwired pages under /pages", () => {
    assert.equal(getCmsPagePublicPath("privacy-policy"), "/pages/privacy-policy");
    assert.equal(getCmsPageLocalizedPublicPath("en", "privacy-policy"), "/en/pages/privacy-policy");
  });

  it("normalizes legacy /pages/home and /home to locale home", () => {
    assert.equal(normalizeWiredCmsPathname("/en/pages/home"), "/en");
    assert.equal(normalizeWiredCmsPathname("/en/home"), "/en");
    assert.equal(
      normalizeWiredCmsAbsoluteUrl("https://brt-me.com/en/pages/home"),
      "https://brt-me.com/en",
    );
  });

  it("normalizes wired service CMS paths", () => {
    assert.equal(
      normalizeWiredCmsPathname("/en/pages/enterprise-wireless"),
      "/en/services/enterprise-wireless",
    );
  });
});
