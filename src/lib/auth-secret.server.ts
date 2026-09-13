import "server-only";

import { randomBytes } from "node:crypto";
import { readSystemSettings, writeSystemSettings } from "@/features/setup/setup.service";
import { getMiddlewareManifestAuthSecret } from "@/features/setup/middleware-manifest";
import {
  getAuthSecretFromEnv,
  isUsableAuthSecret,
} from "@/lib/auth-secret.shared";

export { getAuthSecretFromEnv, isUsableAuthSecret } from "@/lib/auth-secret.shared";

let cachedAuthSecret: string | undefined;

export async function resolveAuthSecret(): Promise<string | undefined> {
  if (cachedAuthSecret) return cachedAuthSecret;

  const fromEnv = getAuthSecretFromEnv();
  if (fromEnv) {
    cachedAuthSecret = fromEnv;
    return fromEnv;
  }

  const fromManifest = getMiddlewareManifestAuthSecret();
  if (fromManifest) {
    cachedAuthSecret = fromManifest;
    return fromManifest;
  }

  try {
    const settings = await readSystemSettings();
    if (isUsableAuthSecret(settings.authSecret)) {
      cachedAuthSecret = settings.authSecret;
      return settings.authSecret;
    }

    if (settings.setupComplete) {
      const generated = randomBytes(32).toString("base64url");
      await writeSystemSettings({ authSecret: generated });
      cachedAuthSecret = generated;
      return generated;
    }
  } catch (error) {
    console.error("[auth] resolveAuthSecret failed:", error);
  }

  return undefined;
}

export async function ensureAuthSecretAtSetup(): Promise<string> {
  const existing = await resolveAuthSecret();
  if (existing) return existing;

  const generated = randomBytes(32).toString("base64url");
  await writeSystemSettings({ authSecret: generated });
  cachedAuthSecret = generated;
  return generated;
}
