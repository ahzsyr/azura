export type SetupDatabaseKind = "mysql" | "postgresql" | "unknown";

export type SetupStatusResult = {
  setupComplete: boolean;
  registrationEnabled: boolean;
  comingSoonEnabled: boolean;
  comingSoonEnvOverride: boolean | null;
  completedAt: string | null;
  databaseReady: boolean;
  databaseError: string | null;
  databaseKind: SetupDatabaseKind;
};
