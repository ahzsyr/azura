import type { SeoHttpStatus, SeoRobotsDirective } from "./seo-document";
import { isNoIndexRobots } from "./seo-robots";
import { normalizeCanonicalForGoogle } from "./seo-canonical-google";

export type CanonicalResolveInput = {
  status: SeoHttpStatus;
  robots: SeoRobotsDirective | null;
  storedCanonical?: string | null;
  defaultCanonical: string;
  allowlist?: string[];
  localePrefixes?: string[];
};

/**
 * Canonical rules:
 * - 200 + indexable → canonical (manual override wins)
 * - 200 + noindex → omit canonical
 * - 4xx/5xx → omit canonical
 */
export function resolveCanonical(input: CanonicalResolveInput): string | undefined {
  if (input.status !== 200) return undefined;
  if (isNoIndexRobots(input.robots)) return undefined;

  const stored = input.storedCanonical?.trim();
  const raw = stored || input.defaultCanonical;
  return normalizeCanonicalForGoogle(raw, {
    allowlist: input.allowlist,
    localePrefixes: input.localePrefixes,
  });
}
