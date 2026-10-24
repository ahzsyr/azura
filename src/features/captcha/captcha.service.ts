import "server-only";

import { jsonStoreService } from "@/features/storage/json-store.service";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import {
  CAPTCHA_SCOPES,
  captchaSettingsSchema,
  defaultCaptchaSettings,
  type CaptchaKeys,
  type CaptchaOverride,
  type CaptchaScope,
  type CaptchaSettings,
  type CaptchaSettingsPublic,
  type SaveCaptchaSettingsInput,
} from "@/features/captcha/captcha.schema";
import {
  hasUsableKeys,
  resolveCaptchaRequirement,
} from "@/features/captcha/captcha.resolver";
import type { CaptchaRequirement } from "@/features/captcha/captcha.schema";

export const CAPTCHA_NAMESPACE = "captcha";
export const CAPTCHA_SETTINGS_KEY = "settings";

/**
 * Captcha settings live in JsonStore rather than env because `NEXT_PUBLIC_*`
 * values are inlined at build time — a site key changed in env needs a rebuild,
 * while this needs only a save.
 *
 * Env (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`) is a fallback
 * for deployments that configured it before this screen existed.
 */

function envKeys(): CaptchaKeys {
  return {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
    hasSecret: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()),
  };
}

function normalize(raw: unknown): CaptchaSettings {
  const base = defaultCaptchaSettings();
  if (!raw || typeof raw !== "object") return base;
  const parsed = captchaSettingsSchema.safeParse({ ...base, ...(raw as object) });
  if (!parsed.success) return base;
  const data = parsed.data;
  return {
    enabled: data.enabled,
    provider: data.provider,
    siteKey: data.siteKey,
    ...(data.secretKeySealed ? { secretKeySealed: data.secretKeySealed } : {}),
    scopes: data.scopes,
  };
}

async function readSettings(): Promise<CaptchaSettings> {
  try {
    const stored = await jsonStoreService.get<unknown>(CAPTCHA_NAMESPACE, CAPTCHA_SETTINGS_KEY);
    return normalize(stored);
  } catch (error) {
    console.error("[captcha] settings read failed:", error instanceof Error ? error.name : "unknown");
    return defaultCaptchaSettings();
  }
}

/** Stored keys win; env fills any gap. */
export async function getCaptchaKeys(): Promise<CaptchaKeys & { siteKeySource: "settings" | "env" | "none" }> {
  const settings = await readSettings();
  const env = envKeys();
  const storedSecret = Boolean(unsealSecret(settings.secretKeySealed));
  const siteKey = settings.siteKey.trim() || env.siteKey;
  return {
    siteKey,
    hasSecret: storedSecret || env.hasSecret,
    siteKeySource: settings.siteKey.trim() ? "settings" : env.siteKey ? "env" : "none",
  };
}

export async function getCaptchaSecret(): Promise<string | undefined> {
  const settings = await readSettings();
  return unsealSecret(settings.secretKeySealed) ?? process.env.TURNSTILE_SECRET_KEY?.trim() ?? undefined;
}

export async function getCaptchaSettingsPublic(): Promise<CaptchaSettingsPublic> {
  const settings = await readSettings();
  const keys = await getCaptchaKeys();
  const scopes = Object.fromEntries(
    CAPTCHA_SCOPES.map((scope) => [scope, settings.scopes[scope] ?? "inherit"]),
  ) as Record<CaptchaScope, CaptchaOverride>;
  return {
    enabled: settings.enabled,
    provider: "turnstile",
    siteKey: keys.siteKey,
    hasSecretKey: keys.hasSecret,
    scopes,
    configured: hasUsableKeys(keys),
    siteKeySource: keys.siteKeySource,
  };
}

/**
 * Server-side decision for one endpoint (optionally one form).
 * Every route and every form must use this instead of checking env directly.
 */
export async function resolveCaptchaFor(
  scope: CaptchaScope,
  formOverride?: CaptchaOverride,
): Promise<CaptchaRequirement> {
  const settings = await readSettings();
  const keys = await getCaptchaKeys();
  return resolveCaptchaRequirement({ settings, keys, scope, formOverride });
}

export async function saveCaptchaSettings(
  input: SaveCaptchaSettingsInput,
): Promise<CaptchaSettingsPublic> {
  const current = await readSettings();

  const siteKey = input.siteKey !== undefined ? input.siteKey.trim() : current.siteKey;
  const nextSecret = input.clearSecretKey
    ? undefined
    : sealSecret(input.secretKey) ?? current.secretKeySealed;

  const scopes = { ...current.scopes };
  if (input.scopes) {
    for (const scope of CAPTCHA_SCOPES) {
      const value = input.scopes[scope];
      if (value) scopes[scope] = value;
    }
  }

  const next: CaptchaSettings = {
    enabled: input.enabled ?? current.enabled,
    provider: "turnstile",
    siteKey,
    ...(nextSecret ? { secretKeySealed: nextSecret } : {}),
    scopes,
  };

  captchaSettingsSchema.parse(next);
  await jsonStoreService.set(
    CAPTCHA_NAMESPACE,
    CAPTCHA_SETTINGS_KEY,
    next as unknown as Parameters<typeof jsonStoreService.set>[2],
    { revalidate: true },
  );
  return getCaptchaSettingsPublic();
}

export type TurnstileKeyCheck =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Validates the *keys* against Cloudflare. A dummy token always fails
 * siteverify's token check, but an invalid/unauthorized secret returns
 * error-codes such as invalid-input-secret, which is what we are looking for.
 */
export async function verifyTurnstileKeys(remoteIp?: string): Promise<TurnstileKeyCheck> {
  const secret = await getCaptchaSecret();
  const keys = await getCaptchaKeys();
  if (!keys.siteKey.trim()) return { ok: false, message: "Site key is missing." };
  if (!secret) return { ok: false, message: "Secret key is missing." };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", "0.XXXX-turnstile-key-check");
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    const codes = data["error-codes"] ?? [];
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      return { ok: false, message: "Cloudflare rejected the secret key. Check that it matches this site key." };
    }
    if (data.success) {
      return { ok: true, message: "Keys accepted by Cloudflare." };
    }
    // invalid-input-response is expected for a dummy token: the secret checked out.
    return { ok: true, message: "Secret key accepted by Cloudflare (token check skipped)." };
  } catch (error) {
    return {
      ok: false,
      message: `Could not reach Cloudflare Turnstile: ${error instanceof Error ? error.name : "network error"}`,
    };
  }
}
