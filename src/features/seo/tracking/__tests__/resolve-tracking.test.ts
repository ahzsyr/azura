import test from "node:test";
import assert from "node:assert/strict";
import {
  extractGtmContainerIdFromSnippet,
  extractGtmNoscriptIframeSrc,
  extractHeadScriptContent,
  extractMeasurementIdFromSnippet,
} from "../parse-tracking-snippets";
import {
  isTrackingConfigured,
  normalizeGtmContainerId,
  normalizeMeasurementId,
  resolveActiveSiteTracking,
  resolveActiveSiteTrackings,
} from "../resolve-tracking";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WT7PVPZK');</script>
<!-- End Google Tag Manager -->`;

const GTAG_HEAD = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-FT9BLK7W1T"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-FT9BLK7W1T');
</script>`;

test("normalizeMeasurementId accepts GA4 IDs", () => {
  assert.equal(normalizeMeasurementId("g-ft9blk7w1t"), "G-FT9BLK7W1T");
  assert.equal(normalizeMeasurementId("invalid"), undefined);
});

test("normalizeGtmContainerId accepts GTM IDs", () => {
  assert.equal(normalizeGtmContainerId("gtm-abc123"), "GTM-ABC123");
  assert.equal(normalizeGtmContainerId("G-123"), undefined);
});

test("extractMeasurementIdFromSnippet parses pasted gtag code", () => {
  assert.equal(extractMeasurementIdFromSnippet(GTAG_HEAD), "G-FT9BLK7W1T");
});

test("extractGtmContainerIdFromSnippet parses pasted GTM code", () => {
  assert.equal(extractGtmContainerIdFromSnippet(GTM_HEAD), "GTM-WT7PVPZK");
});

test("extractHeadScriptContent returns inline script body", () => {
  const script = extractHeadScriptContent(GTM_HEAD);
  assert.match(script ?? "", /GTM-WT7PVPZK/);
});

test("extractGtmNoscriptIframeSrc parses iframe src", () => {
  const body = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WT7PVPZK"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  assert.equal(
    extractGtmNoscriptIframeSrc(body),
    "https://www.googletagmanager.com/ns.html?id=GTM-WT7PVPZK",
  );
});

test("resolveActiveSiteTrackings installs both GA4 and GTM when both enabled", () => {
  restoreEnv();
  delete process.env.NEXT_PUBLIC_GA_ID;

  const active = resolveActiveSiteTrackings({
    enabled: true,
    gtagEnabled: true,
    gtmEnabled: true,
    measurementId: "G-TEST123",
    gtmContainerId: "GTM-ABC123",
  });

  assert.equal(active.length, 2);
  assert.equal(active[0]?.kind, "gtag");
  assert.equal(active[1]?.kind, "gtm");
});

test("resolveActiveSiteTrackings keeps GA4 active when GTM is enabled separately", () => {
  restoreEnv();
  delete process.env.NEXT_PUBLIC_GA_ID;

  const active = resolveActiveSiteTrackings({
    enabled: true,
    gtagEnabled: true,
    gtmEnabled: true,
    measurementId: "G-FT9BLK7W1T",
    gtmContainerId: "GTM-WT7PVPZK",
  });

  assert.deepEqual(
    active.map((item) => item.kind),
    ["gtag", "gtm"],
  );
});

test("isTrackingConfigured accepts both services enabled", () => {
  assert.equal(
    isTrackingConfigured({
      enabled: true,
      gtagEnabled: true,
      gtmEnabled: true,
      measurementId: "G-ABC",
      gtmContainerId: "GTM-XYZ",
    }),
    true,
  );
});

test("resolveActiveSiteTracking prefers saved gtag config", () => {
  restoreEnv();
  delete process.env.NEXT_PUBLIC_GA_ID;

  const active = resolveActiveSiteTracking({
    enabled: true,
    mode: "gtag",
    measurementId: "G-TEST123",
  });

  assert.equal(active?.kind, "gtag");
  if (active?.kind === "gtag") {
    assert.equal(active.measurementId, "G-TEST123");
  }
});

test("resolveActiveSiteTracking uses GTM when mode is gtm", () => {
  const active = resolveActiveSiteTracking({
    enabled: true,
    mode: "gtm",
    gtmContainerId: "GTM-ABC123",
    gtmHeadSnippet: GTM_HEAD,
  });

  assert.equal(active?.kind, "gtm");
  if (active?.kind === "gtm") {
    assert.equal(active.containerId, "GTM-ABC123");
    assert.equal(active.headSnippet, GTM_HEAD);
  }
});

test("resolveActiveSiteTracking resolves GTM ID from snippets only", () => {
  const active = resolveActiveSiteTracking({
    enabled: true,
    mode: "gtm",
    gtmHeadSnippet: GTM_HEAD,
    gtmBodySnippet: `<!-- body -->`,
  });

  assert.equal(active?.kind, "gtm");
  if (active?.kind === "gtm") {
    assert.equal(active.containerId, "GTM-WT7PVPZK");
  }
});

test("resolveActiveSiteTracking respects explicit disable", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_GA_ID = "G-ENV123";

  assert.equal(
    resolveActiveSiteTracking({ enabled: false, measurementId: "G-SAVED" }),
    null,
  );
});

test("resolveActiveSiteTracking falls back to env when not configured", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_GA_ID = "G-ENV123";

  assert.deepEqual(resolveActiveSiteTracking({}), {
    kind: "gtag",
    measurementId: "G-ENV123",
  });
});

test("isTrackingConfigured requires enabled and valid ID or snippet", () => {
  assert.equal(
    isTrackingConfigured({ enabled: true, mode: "gtag", measurementId: "G-ABC" }),
    true,
  );
  assert.equal(
    isTrackingConfigured({ enabled: true, mode: "gtm", gtmHeadSnippet: GTM_HEAD }),
    true,
  );
  assert.equal(
    isTrackingConfigured({ enabled: false, mode: "gtag", measurementId: "G-ABC" }),
    false,
  );
});
