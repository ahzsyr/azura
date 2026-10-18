/** Settings written after a full setup reset. Matches a first deploy: welcome page, setup not finished. */
export const RESET_SYSTEM_SETTINGS = {
  setupComplete: false,
  completedAt: undefined,
  comingSoonEnabled: false,
  registrationEnabled: true,
} as const;
