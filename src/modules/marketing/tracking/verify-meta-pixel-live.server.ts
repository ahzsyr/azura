import "server-only";

import { normalizeMetaPixelId } from "@/modules/marketing/tracking/meta-pixel";
import type { MetaPixelLiveVerifyResult } from "@/modules/marketing/tracking/verify-meta-pixel-live.types";

export type { MetaPixelLiveVerifyResult };

function normalizeSiteUrl(siteUrl: string): string | { error: string } {
  const trimmed = siteUrl.trim();
  if (!trimmed) return { error: "Site URL is empty." };
  try {
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return { error: "Invalid site URL." };
  }
}

/**
 * Fetch the public homepage HTML and check for Meta Pixel install signals.
 * Used by admin Tracking → Meta install status (not a guarantee Meta Events Manager will pass).
 */
export async function verifyMetaPixelOnLiveSite(input: {
  siteUrl: string;
  expectedPixelId: string;
}): Promise<MetaPixelLiveVerifyResult> {
  const fetchedAt = new Date().toISOString();
  const normalized = normalizeSiteUrl(input.siteUrl);
  if (typeof normalized !== "string") {
    return {
      found: false,
      signals: { fbq: false, fbeventsJs: false, pixelIdInHtml: false },
      fetchedAt,
      url: input.siteUrl,
      error: normalized.error,
    };
  }

  const pixelId = normalizeMetaPixelId(input.expectedPixelId);
  if (!pixelId) {
    return {
      found: false,
      signals: { fbq: false, fbeventsJs: false, pixelIdInHtml: false },
      fetchedAt,
      url: normalized,
      error: "Expected Pixel ID is missing or invalid.",
    };
  }

  try {
    const response = await fetch(normalized, {
      headers: {
        Accept: "text/html",
        "User-Agent": "BRT-Meta-Pixel-Verify/1.0",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        found: false,
        signals: { fbq: false, fbeventsJs: false, pixelIdInHtml: false },
        fetchedAt,
        url: normalized,
        error: `HTTP ${response.status} for ${normalized}`,
      };
    }

    const html = await response.text();
    const fbq = /\bfbq\b/.test(html);
    const fbeventsJs = /connect\.facebook\.net\/[^"'>\s]*fbevents\.js/i.test(html);
    const pixelIdInHtml =
      html.includes(pixelId) ||
      new RegExp(`fbq\\s*\\(\\s*['"]init['"]\\s*,\\s*['"]${pixelId}['"]`, "i").test(html) ||
      new RegExp(`[?&]id=${pixelId}(?:&|"|'|\\s|>|$)`).test(html);

    const found = (fbq || fbeventsJs) && pixelIdInHtml;

    return {
      found,
      signals: { fbq, fbeventsJs, pixelIdInHtml },
      fetchedAt,
      url: normalized,
    };
  } catch (error) {
    return {
      found: false,
      signals: { fbq: false, fbeventsJs: false, pixelIdInHtml: false },
      fetchedAt,
      url: normalized,
      error: error instanceof Error ? error.message : "Fetch failed.",
    };
  }
}
