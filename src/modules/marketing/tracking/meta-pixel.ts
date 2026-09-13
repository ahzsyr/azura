/** Meta Pixel base-code helpers (Events Manager → Set up → Install code manually). */

export type MetaPixelTrackingMetadata = {
  headSnippet?: string;
  setupMethod?: "code";
};

export function normalizeMetaPixelId(raw: string | null | undefined): string | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 5 ? digits : undefined;
}

/** Extract Pixel ID from pasted Meta Pixel base code. */
export function extractMetaPixelIdFromSnippet(snippet: string): string | undefined {
  const trimmed = snippet.trim();
  if (!trimmed) return undefined;

  const fromInit = trimmed.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i);
  if (fromInit?.[1]) return normalizeMetaPixelId(fromInit[1]);

  const fromNoscript = trimmed.match(/facebook\.com\/tr\?[^"'>\s]*[?&]id=(\d+)/i);
  if (fromNoscript?.[1]) return normalizeMetaPixelId(fromNoscript[1]);

  const fromQuery = trimmed.match(/[?&]id=(\d{5,})/i);
  if (fromQuery?.[1]) return normalizeMetaPixelId(fromQuery[1]);

  return undefined;
}

/** Build the official Meta Pixel head base code for a Pixel ID. */
export function buildMetaPixelBaseCode(pixelId: string): string {
  const id = normalizeMetaPixelId(pixelId) ?? pixelId.trim();
  return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;
}

/** Inline script body from a pasted Meta Pixel head snippet. */
export function extractMetaPixelScriptContent(snippet: string): string | undefined {
  const trimmed = snippet.trim();
  if (!trimmed) return undefined;

  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(trimmed)) !== null) {
    const attrs = match[1] ?? "";
    const body = match[2]?.trim() ?? "";
    if (/\bsrc\s*=/.test(attrs) && !body) continue;
    if (body && (body.includes("fbq") || body.includes("fbevents"))) return body;
  }

  if (trimmed.includes("fbq") && !trimmed.includes("<")) {
    return trimmed;
  }

  return undefined;
}

export function extractMetaPixelNoscriptSrc(snippet: string, pixelId: string): string {
  const trimmed = snippet.trim();
  const match = trimmed.match(/src=["']([^"']*facebook\.com\/tr\?[^"']+)["']/i);
  if (match?.[1]) return match[1];
  const id = normalizeMetaPixelId(pixelId) ?? pixelId.trim();
  return `https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`;
}

export function resolveMetaPixelInitScript(pixelId: string, headSnippet?: string): string {
  if (headSnippet) {
    const parsed = extractMetaPixelScriptContent(headSnippet);
    if (parsed) return parsed;
  }
  const id = normalizeMetaPixelId(pixelId) ?? pixelId.trim();
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');`;
}

export function readMetaPixelHeadSnippet(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const snippet = (metadata as MetaPixelTrackingMetadata).headSnippet;
  return typeof snippet === "string" && snippet.trim() ? snippet.trim() : undefined;
}
