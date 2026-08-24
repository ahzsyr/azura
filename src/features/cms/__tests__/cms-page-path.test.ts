import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCmsPageLocalizedPublicPath,
  getCmsPagePublicPath,
  getWiredCmsPageRedirect,
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

  it("wires solutions CMS page to /solutions and off /pages/solutions", () => {
    assert.equal(getCmsPagePublicPath("solutions"), "/solutions");
    assert.equal(getCmsPageLocalizedPublicPath("en", "solutions"), "/en/solutions");
    assert.equal(normalizeWiredCmsPathname("/en/pages/solutions"), "/en/solutions");
    assert.equal(getWiredCmsPageRedirect("/en/pages/solutions", ["en", "ar"]), "/en/solutions");
    assert.equal(getWiredCmsPageRedirect("/en/solutions", ["en"]), null);
  });

  it("normalizes wired service CMS paths", () => {
    assert.equal(
      normalizeWiredCmsPathname("/en/pages/enterprise-wireless"),
      "/en/services/enterprise-wireless",
    );
  });
});
