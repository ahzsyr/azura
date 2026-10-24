import "server-only";

import type { CaptchaOverride, CaptchaScope } from "@/features/captcha/captcha.schema";

/**
 * Thin enforcement layer used by every public endpoint.
 *
 * Resolves the requirement from settings (global switch + scope/form override
 * + key availability) and only verifies a token when that requirement is
 * `required`. This is the single place that answers "must this request carry a
 * captcha token?", so an endpoint can never be stricter than the widget it
 * renders.
 */

export type CaptchaCheck =
  | { ok: true; enforced: boolean }
  | { ok: false; enforced: true };

export async function checkCaptcha(input: {
  scope: CaptchaScope;
  token: string | null | undefined;
  remoteIp?: string;
  formOverride?: CaptchaOverride;
}): Promise<CaptchaCheck> {
  const { resolveCaptchaFor, getCaptchaSecret } = await import(
    "@/features/captcha/captcha.service"
  );
  const { verifyTurnstileTokenWithSecret } = await import("@/lib/turnstile");

  const requirement = await resolveCaptchaFor(input.scope, input.formOverride);
  if (!requirement.required) {
    return { ok: true, enforced: false };
  }

  const secret = await getCaptchaSecret();
  if (!secret) {
    // Requirement said required, but the secret vanished; never block on an
    // unverifiable captcha (resolveCaptchaFor already guards this, kept cheap).
    return { ok: true, enforced: false };
  }

  const verified = await verifyTurnstileTokenWithSecret(secret, input.token, input.remoteIp);
  return verified ? { ok: true, enforced: true } : { ok: false, enforced: true };
}
