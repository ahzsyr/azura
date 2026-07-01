const PLACEHOLDER_AUTH_SECRETS = new Set([
  "CHANGE_TO_LONG_RANDOM_SECRET",
  "your-stable-auth-secret",
  "local-development-seo-integrations-secret",
]);

export function isUsableAuthSecret(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < 16) return false;
  return !PLACEHOLDER_AUTH_SECRETS.has(trimmed);
}

export function getAuthSecretFromEnv(): string | undefined {
  const candidates = [process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET];
  for (const candidate of candidates) {
    if (isUsableAuthSecret(candidate)) return candidate.trim();
  }
  return undefined;
}
