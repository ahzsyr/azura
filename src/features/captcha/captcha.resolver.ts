import type {
  CaptchaOverride,
  CaptchaRequirement,
  CaptchaScope,
  CaptchaSettings,
} from "@/features/captcha/captcha.schema";
import { defaultCaptchaSettings } from "@/features/captcha/captcha.schema";

/**
 * Pure captcha resolution. Kept free of `server-only` so the decision logic is
 * unit-testable and shareable with the client.
 *
 * Single rule that everything honours: a captcha is only enforced AND rendered
 * when it is *requested* (global switch + scope/form override) and *usable*
 * (both keys present). Requesting without keys never blocks a request — that
 * mismatch is what produced "Complete the captcha before continuing." with no
 * visible captcha and a form that could never submit.
 */

export type CaptchaKeys = {
  siteKey: string;
  hasSecret: boolean;
};

export function hasUsableKeys(keys: CaptchaKeys): boolean {
  return Boolean(keys.siteKey.trim()) && keys.hasSecret;
}

/** Resolve one scope/form toggle against the master switch. */
export function resolveOverride(
  override: CaptchaOverride | undefined,
  globalEnabled: boolean,
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;
  return globalEnabled;
}

export function resolveCaptchaRequirement(input: {
  settings: Pick<CaptchaSettings, "enabled" | "scopes">;
  keys: CaptchaKeys;
  scope: CaptchaScope;
  /** Per-form override; only meaningful for the `forms` scope. */
  formOverride?: CaptchaOverride;
}): CaptchaRequirement {
  const { settings, keys, scope, formOverride } = input;
  const override =
    scope === "forms" && formOverride ? formOverride : settings.scopes?.[scope] ?? "inherit";
  const requested = resolveOverride(override, settings.enabled);
  const usable = hasUsableKeys(keys);

  if (!requested) {
    return {
      required: false,
      widgetVisible: false,
      siteKey: keys.siteKey,
      reason:
        override === "off"
          ? "Disabled for this scope."
          : "Captcha is turned off in settings.",
    };
  }

  if (!usable) {
    return {
      required: false,
      widgetVisible: false,
      siteKey: keys.siteKey,
      reason:
        "Captcha is enabled but the site key / secret key are not configured — skipping verification.",
    };
  }

  return {
    required: true,
    widgetVisible: true,
    siteKey: keys.siteKey,
    reason: "Captcha required.",
  };
}

/** Non-blocking default used before settings load (and in tests). */
export function defaultCaptchaRequirement(): CaptchaRequirement {
  const settings = defaultCaptchaSettings();
  return resolveCaptchaRequirement({
    settings,
    keys: { siteKey: "", hasSecret: false },
    scope: "forms",
  });
}
