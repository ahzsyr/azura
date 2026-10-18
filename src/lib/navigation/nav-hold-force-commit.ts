/** Fires before NavigationProgress's 8s last-resort clear. */
export const NAV_HOLD_FORCE_COMMIT_MS = 7500;

export function armNavHoldForceCommit(
  previous: ReturnType<typeof setTimeout> | null,
  onFire: () => void,
): ReturnType<typeof setTimeout> {
  if (previous != null) clearTimeout(previous);
  return setTimeout(onFire, NAV_HOLD_FORCE_COMMIT_MS);
}

export function clearNavHoldForceCommit(id: ReturnType<typeof setTimeout> | null): void {
  if (id != null) clearTimeout(id);
}
