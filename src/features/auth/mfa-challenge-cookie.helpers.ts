/**
 * Pure MFA challenge decisions (unit-testable without Next cookies).
 */

/** Password just verified → mint when the existing challenge cookie is bad. */
export function shouldMintChallengeAfterPassword(challengeValid: boolean): boolean {
  return !challengeValid;
}
