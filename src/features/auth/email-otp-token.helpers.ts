/** Pure EmailOtpToken error classifiers (unit-testable). */

export function isEmailOtpPurposeEnumError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Data truncated for column [`']?purpose[`']?/i.test(message) ||
    /Invalid.*PASSWORD_RESET/i.test(message) ||
    /Invalid.*LOGIN_MFA/i.test(message) ||
    /not a valid enum/i.test(message)
  );
}

export function isEmailOtpChannelColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    code === "P2022" ||
    /Unknown column [`']?channel[`']?/i.test(message) ||
    /column [`']?channel[`']? does not exist/i.test(message)
  );
}
