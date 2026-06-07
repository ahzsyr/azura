/** Admin catalog locale defaults (Astro en-us parity). */
export const defaultLocale = { code: "en-us" as const, urlPrefix: "en" as const };
export const adminLocale = { code: "en-us" as const, urlPrefix: "en" as const };

export function isConfiguredLocaleCode(code: string): boolean {
  const c = code.trim().toLowerCase();
  return c === "en-us" || c === "ar-ae" || c === "en" || c === "ar";
}

export function resolveConfiguredLocaleCode(candidate: string, fallback: string): string {
  const c = candidate.trim().toLowerCase();
  if (c === "en") return "en-us";
  if (c === "ar") return "ar-ae";
  if (isConfiguredLocaleCode(c)) return c;
  return fallback;
}
