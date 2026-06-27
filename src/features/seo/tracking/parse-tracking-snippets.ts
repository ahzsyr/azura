import {
  normalizeGtmContainerId,
  normalizeMeasurementId,
} from "./resolve-tracking";

/** Extract GTM container ID from pasted install code. */
export function extractGtmContainerIdFromSnippet(snippet: string): string | undefined {
  const match = snippet.match(/GTM-[A-Z0-9]+/i);
  return match ? normalizeGtmContainerId(match[0]) : undefined;
}

/** Extract GA4 measurement ID from pasted gtag install code. */
export function extractMeasurementIdFromSnippet(snippet: string): string | undefined {
  const fromQuery = snippet.match(/[?&]id=(G-[A-Z0-9]+)/i);
  if (fromQuery) return normalizeMeasurementId(fromQuery[1]);

  const fromConfig = snippet.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]/i);
  if (fromConfig) return normalizeMeasurementId(fromConfig[1]);

  const fallback = snippet.match(/\bG-[A-Z0-9]+\b/i);
  return fallback ? normalizeMeasurementId(fallback[0]) : undefined;
}

/** Inline script body from a GTM or gtag head snippet (with or without `<script>` tags). */
export function extractHeadScriptContent(snippet: string): string | undefined {
  const trimmed = snippet.trim();
  if (!trimmed) return undefined;

  const scriptMatch = trimmed.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch?.[1]?.trim()) return scriptMatch[1].trim();

  if (trimmed.startsWith("(function") || trimmed.includes("dataLayer")) {
    return trimmed;
  }

  return undefined;
}

/** iframe src for GTM noscript fallback from pasted body snippet. */
export function extractGtmNoscriptIframeSrc(snippet: string): string | undefined {
  const trimmed = snippet.trim();
  if (!trimmed) return undefined;

  const srcMatch = trimmed.match(/src=["']([^"']*ns\.html\?id=GTM-[A-Z0-9]+[^"']*)["']/i);
  if (srcMatch?.[1]) return srcMatch[1];

  const containerId = extractGtmContainerIdFromSnippet(trimmed);
  return containerId
    ? `https://www.googletagmanager.com/ns.html?id=${containerId}`
    : undefined;
}

/** External gtag.js script URL from a pasted head snippet. */
export function extractGtagScriptSrc(snippet: string): string | undefined {
  const match = snippet.match(/src=["']([^"']*googletagmanager\.com\/gtag\/js[^"']*)["']/i);
  return match?.[1];
}
