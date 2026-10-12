/** Settings written after a full setup reset. Visitors stay on coming soon until setup finishes. */
export const RESET_SYSTEM_SETTINGS = {
  setupComplete: false,
  completedAt: undefined,
  comingSoonEnabled: true,
  registrationEnabled: true,
} as const;
