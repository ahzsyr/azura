import "server-only";

import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { getCanonicalAppOrigin } from "@/lib/oauth-redirect-origin";

const DEFAULT_TIMEOUT_MS = 8_000;

export type AuditProbeResult = {
  status: number | null;
  html: string;
  probedUrl: string;
};

/** Prefer loopback/internal origin so audits do not self-fetch the public CDN hostname. */
export async function resolveAuditProbeOrigin(): Promise<string> {
  const port = process.env.PORT?.trim() || "3000";
  const candidates = [
    process.env.SEO_AUDIT_ORIGIN?.trim(),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : undefined,
    `http://127.0.0.1:${port}`,
    getCanonicalAppOrigin(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      return new URL(candidate.replace(/\/$/, "") || candidate).origin;
    } catch {
      // continue
    }
  }
  return `http://127.0.0.1:${port}`;
}

/** Public site origin used for sitemap/canonical comparisons. */
export async function resolveAuditPublicOrigin(): Promise<string> {
  return (await resolveSiteOrigin("sitemap")).replace(/\/$/, "");
}

/**
 * Rewrite a public absolute URL to the internal probe origin (same path + search).
 * Leaves non-site URLs unchanged.
 */
export function toProbeUrl(publicUrl: string, publicOrigin: string, probeOrigin: string): string {
  try {
    const url = new URL(publicUrl);
    const site = new URL(publicOrigin);
    if (url.origin !== site.origin) return publicUrl;
    const probe = new URL(probeOrigin);
    url.protocol = probe.protocol;
    url.host = probe.host;
    return url.href;
  } catch {
    return publicUrl;
  }
}

export function normalizeAuditUrl(raw: string, baseOrigin: string): string {
  try {
    return new URL(raw, baseOrigin).href.replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** GET probe — preferred over HEAD (shared hosts often mishandle HEAD). */
export async function probeUrlStatus(
  url: string,
  options?: { timeoutMs?: number; publicOrigin?: string; probeOrigin?: string },
): Promise<number | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const publicOrigin = options?.publicOrigin;
  const probeOrigin = options?.probeOrigin;
  const target =
    publicOrigin && probeOrigin ? toProbeUrl(url, publicOrigin, probeOrigin) : url;

  try {
    return await withTimeout(timeoutMs, async (signal) => {
      const response = await fetch(target, {
        method: "GET",
        headers: { Accept: "text/html,*/*" },
        cache: "no-store",
        signal,
        redirect: "follow",
      });
      return response.status;
    });
  } catch {
    // Fall back to public URL once if we used an internal origin.
    if (target !== url) {
      try {
        return await withTimeout(timeoutMs, async (signal) => {
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "text/html,*/*" },
            cache: "no-store",
            signal,
            redirect: "follow",
          });
          return response.status;
        });
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function probeHtml(
  url: string,
  options?: { timeoutMs?: number; publicOrigin?: string; probeOrigin?: string },
): Promise<AuditProbeResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const publicOrigin = options?.publicOrigin;
  const probeOrigin = options?.probeOrigin;
  const target =
    publicOrigin && probeOrigin ? toProbeUrl(url, publicOrigin, probeOrigin) : url;

  const attempt = async (probeUrl: string): Promise<AuditProbeResult> => {
    try {
      return await withTimeout(timeoutMs, async (signal) => {
        const response = await fetch(probeUrl, {
          method: "GET",
          headers: { Accept: "text/html" },
          cache: "no-store",
          signal,
          redirect: "follow",
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
          return { status: response.status, html: "", probedUrl: probeUrl };
        }
        if (!contentType.includes("text/html")) {
          return { status: response.status, html: "", probedUrl: probeUrl };
        }
        return { status: response.status, html: await response.text(), probedUrl: probeUrl };
      });
    } catch {
      return { status: null, html: "", probedUrl: probeUrl };
    }
  };

  const first = await attempt(target);
  if (first.status != null || target === url) return first;
  return attempt(url);
}

/** Run async work over items with a concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]!, index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}
