import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUploadVisibleTo,
  uploadResponseCacheControl,
} from "@/app/api/local-uploads/upload-access-policy";
import {
  KNOWN_PUBLIC_ICON_SVG_PATHS,
  isKnownPublicIconPath,
  resolveUploadContentMetadata,
} from "@/app/api/local-uploads/upload-content-metadata";
import {
  containsActiveSvgContent,
  looksLikeSvg,
  sanitizeSvg,
} from "@/lib/security/svg-sanitize";

describe("uploads authorize from MediaAsset.visibility", () => {
  it("serves PUBLIC anonymously", () => {
    assert.equal(isUploadVisibleTo({ visibility: "PUBLIC" }, false), true);
  });

  it("PRIVATE requires an admin session", () => {
    assert.equal(isUploadVisibleTo({ visibility: "PRIVATE" }, false), false);
    assert.equal(isUploadVisibleTo({ visibility: "PRIVATE" }, true), true);
  });

  it("authorizes the exact asset before any redirect", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../../app/api/local-uploads/[...path]/route.ts", import.meta.url),
      "utf8",
    );
    const authzAt = src.indexOf("resolveAuthorization");
    const redirectAt = src.indexOf("NextResponse.redirect");
    assert.ok(authzAt >= 0 && redirectAt > authzAt);
    assert.doesNotMatch(src, /endsWith:/);
    assert.match(src, /rows\.length !== 1/);
    assert.match(src, /containsActiveSvgContent/);
  });

  it("GATED is not public (admin only)", () => {
    assert.equal(isUploadVisibleTo({ visibility: "GATED" }, false), false);
  });

  it("missing row denies (route returns 404)", () => {
    assert.equal(isUploadVisibleTo(null, false), false);
    assert.equal(isUploadVisibleTo(undefined, false), false);
  });

  it("lookup error is represented as null and denies", () => {
    // The route maps both a thrown lookup and a missing row to null.
    const lookupError = null;
    assert.equal(isUploadVisibleTo(lookupError, false), false);
  });

  it("image mediaType / mimeType no longer implies public", () => {
    assert.equal(
      isUploadVisibleTo({ visibility: "PRIVATE", mediaType: "IMAGE", mimeType: "image/png" }, false),
      false,
    );
    assert.equal(
      isUploadVisibleTo({ visibility: "PRIVATE", mediaType: "SVG", mimeType: "image/svg+xml" }, false),
      false,
    );
  });
});

describe("upload cache policy never caches private bytes", () => {
  it("PRIVATE and GATED are no-store", () => {
    assert.equal(uploadResponseCacheControl({ visibility: "PRIVATE" }, "image/png", false), "private, no-store");
    assert.equal(uploadResponseCacheControl({ visibility: "GATED" }, "application/pdf", false), "private, no-store");
  });

  it("unknown asset is no-store", () => {
    assert.equal(uploadResponseCacheControl(null, "image/png", false), "private, no-store");
  });

  it("PUBLIC keeps existing caching behaviour", () => {
    assert.equal(uploadResponseCacheControl({ visibility: "PUBLIC" }, "image/png", false), "public, max-age=86400");
    assert.equal(uploadResponseCacheControl({ visibility: "PUBLIC" }, "image/png", true), "private, no-store");
    assert.equal(uploadResponseCacheControl({ visibility: "PUBLIC" }, "video/quicktime", false), "private, no-store");
  });
});

describe("SVG response disposition", () => {
  it("non-icon SVG is an attachment", () => {
    const meta = resolveUploadContentMetadata(".svg", "/uploads/svg/invoice.svg");
    assert.equal(meta.contentType, "image/svg+xml");
    assert.equal(meta.forceAttachment, true);
    assert.match(meta.contentDisposition ?? "", /^attachment;/);
    assert.equal(meta.contentSecurityPolicy, undefined, "no CSP on <img> SVG responses");
  });

  it("known public icon paths render inline", () => {
    for (const iconPath of KNOWN_PUBLIC_ICON_SVG_PATHS) {
      const meta = resolveUploadContentMetadata(".svg", iconPath);
      assert.equal(meta.forceAttachment, false, iconPath);
      assert.match(meta.contentDisposition ?? "", /^inline;/);
    }
  });

  it("icon matching ignores case and query, rejects lookalikes", () => {
    assert.equal(isKnownPublicIconPath("/uploads/svg/FAVICON.svg?v=2"), true);
    assert.equal(isKnownPublicIconPath("/uploads/svg/favicon.svg.evil"), false);
    assert.equal(isKnownPublicIconPath("/uploads/svg/../../favicon.svg"), false);
  });

  it("non-SVG images stay inline", () => {
    const meta = resolveUploadContentMetadata(".png", "/uploads/images/a.png");
    assert.equal(meta.forceAttachment, false);
  });
});

describe("SVG sanitization on upload", () => {
  it("strips script elements", () => {
    const out = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>');
    assert.equal(/<script/i.test(out), false);
    assert.ok(out.includes("<rect"));
  });

  it("strips event handler attributes", () => {
    const out = sanitizeSvg('<svg onload="alert(1)"><rect onclick=\'x\' onmouseover=y/></svg>');
    assert.equal(/\son[a-z]+\s*=/i.test(out), false);
  });

  it("strips javascript: and external href/xlink:href", () => {
    const out = sanitizeSvg(
      '<svg><a xlink:href="javascript:alert(1)"><text>a</text></a><image href="https://evil.test/x.png"/><use href="#ok"/></svg>',
    );
    assert.equal(/javascript:/i.test(out), false);
    assert.equal(/evil\.test/.test(out), false);
    assert.ok(out.includes('href="#ok"'), "internal fragment reference preserved");
  });

  it("strips external refs inside style blocks and url()", () => {
    const out = sanitizeSvg(
      '<svg><style>@import url(https://evil.test/a.css); rect{fill:url(https://evil.test/b)}</style><rect style="fill:url(https://evil.test/c)"/></svg>',
    );
    assert.equal(/evil\.test/.test(out), false);
  });

  it("strips foreignObject/iframe/object/embed and DOCTYPE", () => {
    const out = sanitizeSvg(
      '<!DOCTYPE svg [<!ENTITY x "y">]><svg><foreignObject><iframe src="https://evil"></iframe></foreignObject><object data="x"/><embed src="y"/></svg>',
    );
    assert.equal(/foreignObject|iframe|<object|<embed/i.test(out), false);
    assert.equal(/<!DOCTYPE/i.test(out), false);
  });

  it("leaves benign SVG intact", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z" fill="#0af"/></svg>';
    assert.equal(sanitizeSvg(svg), svg);
    assert.equal(containsActiveSvgContent(sanitizeSvg(svg)), false);
  });

  it("containsActiveSvgContent detects surviving script", () => {
    assert.equal(containsActiveSvgContent('<svg><script>1</script></svg>'), true);
    assert.equal(containsActiveSvgContent('<svg><image href="javascript:1"/></svg>'), true);
    assert.equal(containsActiveSvgContent("<svg/>"), false);
  });

  it("is idempotent", () => {
    const once = sanitizeSvg('<svg onload="x"><script>1</script></svg>');
    assert.equal(sanitizeSvg(once), once);
  });
});

describe("SVG sniffing", () => {
  it("detects SVG including BOM and XML prolog", () => {
    assert.equal(looksLikeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), true);
    assert.equal(looksLikeSvg(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("<svg/>")])), true);
    assert.equal(looksLikeSvg(Buffer.from('<?xml version="1.0"?><svg/>')), true);
    assert.equal(looksLikeSvg(Buffer.from("<html><svg/></html>")), false);
  });
});
