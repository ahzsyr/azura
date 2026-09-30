import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetaPixelBaseCode,
  extractMetaPixelIdFromSnippet,
  extractMetaPixelScriptContent,
  normalizeMetaPixelId,
  resolveMetaPixelInitScript,
} from "../tracking/meta-pixel.ts";

const SAMPLE = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '2600123456789012');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=2600123456789012&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;

test("extractMetaPixelIdFromSnippet reads init id", () => {
  assert.equal(extractMetaPixelIdFromSnippet(SAMPLE), "2600123456789012");
});

test("normalizeMetaPixelId strips non-digits", () => {
  assert.equal(normalizeMetaPixelId(" 2600-123 "), "2600123");
});

test("buildMetaPixelBaseCode embeds pixel id", () => {
  const code = buildMetaPixelBaseCode("2600123456789012");
  assert.match(code, /fbq\('init', '2600123456789012'\)/);
  assert.match(code, /id=2600123456789012/);
});

test("extractMetaPixelScriptContent returns fbq body", () => {
  const body = extractMetaPixelScriptContent(SAMPLE);
  assert.ok(body?.includes("fbq('init'"));
  assert.ok(body?.includes("fbevents.js"));
});

test("resolveMetaPixelInitScript prefers pasted snippet", () => {
  const script = resolveMetaPixelInitScript("999", SAMPLE);
  assert.match(script, /2600123456789012/);
  assert.doesNotMatch(script, /fbq\('init', '999'\)/);
});
