import type { CaptchaPublicConfig, CaptchaOverride } from "@/features/captcha/captcha.schema";

/**
 * Client-side decision: should this form show and require a captcha?
 *
 * The server sends `active` (already resolved from the global switch, the
 * scope override, and whether both keys exist) so the widget and the server
 * cannot disagree. A per-form `off` always wins; `on`/`inherit` follow the
 * server's answer for the form scope.
 */
export function isCaptchaRequiredForForm(
  config: CaptchaPublicConfig | null | undefined,
  formOverride?: CaptchaOverride,
): boolean {
  if (formOverride === "off") return false;
  if (!config?.active) return false;
  return Boolean(config.siteKey?.trim());
}

/** Site key to render, or "" when the widget must stay hidden. */
export function captchaSiteKeyFor(
  config: CaptchaPublicConfig | null | undefined,
  formOverride?: CaptchaOverride,
): string {
  return isCaptchaRequiredForForm(config, formOverride) ? (config?.siteKey?.trim() ?? "") : "";
}
