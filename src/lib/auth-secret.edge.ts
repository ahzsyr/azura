import { getMiddlewareManifestAuthSecret } from "@/features/setup/middleware-manifest";
import { getAuthSecretFromEnv } from "@/lib/auth-secret.shared";

/** Edge-safe: env first, then middleware manifest (refreshed after setup). */
export function getAuthSecretForMiddleware(): string | undefined {
  return getAuthSecretFromEnv() ?? getMiddlewareManifestAuthSecret();
}
