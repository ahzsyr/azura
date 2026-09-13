/**
 * Pure helpers for resolving which Google binding owns a touch.
 * No guessing when multiple bindings exist without a discriminator.
 */
export function resolveGoogleProviderBindingId(input: {
  googleBindingIds: string[];
  discriminator?: string | null;
  isGooglePaid: boolean;
}): string | null {
  const ids = input.googleBindingIds;
  if (ids.length === 0) return null;
  const disc = input.discriminator?.trim() || null;
  if (disc) {
    return ids.includes(disc) ? disc : null;
  }
  if (input.isGooglePaid && ids.length === 1) {
    return ids[0]!;
  }
  return null;
}

/** Access token should refresh when expired or within skew of expiry. */
export function shouldRefreshAccessToken(
  expiresAtMs: number | null | undefined,
  nowMs = Date.now(),
  skewMs = 5 * 60 * 1000,
): boolean {
  if (expiresAtMs == null) return false;
  return expiresAtMs - nowMs <= skewMs;
}

/** Campaign spend must never use account-level spend. */
export function resolveCampaignSpendFromBindingRollups(
  bindingSpends: number[],
  accountSpend: number,
): number {
  void accountSpend;
  return bindingSpends.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}
