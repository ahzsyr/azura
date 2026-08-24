import test from "node:test";
import assert from "node:assert/strict";
import { buildAllowedHosts, normalizeAuditUrlWithOrigin } from "../public-schema-audit-url";
import { extractJsonLdFromHtml } from "../extract-jsonld-from-html";

test("normalizeAuditUrlWithOrigin rejects localhost", () => {
  const allowed = buildAllowedHosts("https://brt-me.com");
  const result = normalizeAuditUrlWithOrigin("http://localhost:3000/en", "https://brt-me.com", allowed);
  assert.ok("error" in result);
});

test("normalizeAuditUrlWithOrigin rejects private IP", () => {
  const allowed = buildAllowedHosts("https://brt-me.com");
  const result = normalizeAuditUrlWithOrigin("http://192.168.1.1/en", "https://brt-me.com", allowed);
  assert.ok("error" in result);
});

test("normalizeAuditUrlWithOrigin accepts allowed site path", () => {
  const allowed = buildAllowedHosts("https://brt-me.com");
  const result = normalizeAuditUrlWithOrigin("/en/about", "https://brt-me.com", allowed);
  assert.ok(!("error" in result));
  if (!("error" in result)) {
    assert.match(result.url, /brt-me\.com\/en\/about/);
  }
});

test("extractJsonLdFromHtml parses script blocks", () => {
  const html = `
    <html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"BRT"}]}</script>
    </head></html>
  `;
  const { nodes, invalidBlocks } = extractJsonLdFromHtml(html);
  assert.equal(invalidBlocks, 0);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.["@type"], "Organization");
});
