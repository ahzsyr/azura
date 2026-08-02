/**
 * Metadata-driven Google Integration Platform contracts.
 * Integrations register once; UI, monitoring, automation, and dashboards compose from these definitions.
 */

export type GoogleIntegrationId =
  | "search_console"
  | "analytics"
  | "tag_manager"
  | "merchant_center"
  | "business_profile"
  | "pagespeed"
  | "ads"
  | "indexing_api"
  | "indexnow";

export type GoogleIntegrationCategory =
  | "search"
  | "analytics"
  | "commerce"
  | "local"
  | "performance"
  | "ads"
  | "indexing";

export type GoogleIntegrationCapabilities = {
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  supportsServiceAccount: boolean;
  supportsAutomation: boolean;
  supportsMonitoring: boolean;
  supportsQuota: boolean;
  supportsRunNow: boolean;
  supportsHistory: boolean;
  supportsValidation: boolean;
  supportsDryRun: boolean;
};

export type GoogleConfigFieldType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "secret"
  | "url"
  | "json";

export type GoogleConfigField = {
  key: string;
  label: string;
  type: GoogleConfigFieldType;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  group?: string;
};

export type GoogleConfigurationSchema = {
  fields: GoogleConfigField[];
};

export type GoogleOperationalPolicy = {
  cadenceMinutes: number;
  retryCount: number;
  retryBackoffMs: number;
  timeoutMs: number;
  parallelRequests: number;
  workerEnabled: boolean;
  dryRunDefault: boolean;
  rateLimitPerMinute?: number;
  notificationOnFailure?: boolean;
  notificationOnQuotaWarning?: boolean;
  errorRecovery?: "manual" | "auto_retry" | "skip";
};

export type GoogleGlobalSettings = {
  defaultCloudProjectId?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  sharedServiceAccountJson?: string;
  secretRotationDays?: number;
  globalRateLimitPerMinute?: number;
  defaultRetryPolicy: Pick<GoogleOperationalPolicy, "retryCount" | "retryBackoffMs">;
  defaultWorkerPolicy: Pick<GoogleOperationalPolicy, "workerEnabled" | "parallelRequests" | "timeoutMs">;
  notificationChannels?: string[];
  loggingRetentionDays?: number;
  defaultTimeoutMs?: number;
  environmentValidated?: boolean;
  lastValidatedAt?: string | null;
};

export type GoogleConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reauthenticating"
  | "error";

export type GoogleConnectionSnapshot = {
  state: GoogleConnectionState;
  lastVerifiedAt?: string | null;
  account?: string | null;
  project?: string | null;
  grantedScopes: string[];
  missingScopes: string[];
  authMethod?: "oauth" | "api_key" | "service_account" | "none";
  message?: string;
};

export type GoogleOperationParameter = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "url" | "select";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

export type GoogleOperationDefinition = {
  id: string;
  title: string;
  description: string;
  permission: string;
  parameters?: GoogleOperationParameter[];
  supportsDryRun: boolean;
  supportsScheduling: boolean;
};

export type GoogleOperationResult = {
  ok: boolean;
  message: string;
  dryRun?: boolean;
  data?: Record<string, unknown>;
};

export type GoogleHealthSnapshot = {
  score: number;
  authentication: "ok" | "missing" | "expired" | "error";
  quotaPressure: "ok" | "warning" | "critical" | "unknown";
  lastSuccessAt?: string | null;
  errorRate: number;
  latencyMs?: number | null;
  workerState: "running" | "stopped" | "disabled" | "unknown";
  jobBacklog: number;
  message: string;
};

export type GoogleQuotaSnapshot = {
  label: string;
  current: number;
  maximum: number;
  resetAt?: string | null;
  warningThreshold: number;
  criticalThreshold: number;
  unit?: string;
};

export type GoogleMonitoringSnapshot = {
  health: GoogleHealthSnapshot;
  quota?: GoogleQuotaSnapshot | null;
  runningJobs: number;
  pendingJobs: number;
  lastSyncAt?: string | null;
  warnings: number;
  errors: number;
  metrics: Record<string, number | string>;
};

export type GoogleLifecycleEventType =
  | "ConnectionCreated"
  | "ConnectionLost"
  | "ValidationPassed"
  | "ValidationFailed"
  | "SyncStarted"
  | "SyncCompleted"
  | "SyncFailed"
  | "QuotaExceeded"
  | "WorkerStopped"
  | "ConfigUpdated"
  | "PolicyUpdated"
  | "OperationExecuted";

export type GoogleLifecycleEvent = {
  id: string;
  type: GoogleLifecycleEventType;
  integrationId: GoogleIntegrationId | "global";
  timestamp: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type GoogleHistoryEntry = {
  id: string;
  integrationId: GoogleIntegrationId | "global";
  kind: "operation" | "connection" | "config" | "policy" | "failure" | "retry" | "audit";
  title: string;
  detail: string;
  timestamp: string;
  ok?: boolean;
};

export type GoogleDependency = {
  integrationId: GoogleIntegrationId;
  required: boolean;
  reason: string;
};

export type GoogleValidationResult = {
  ok: boolean;
  message: string;
  warnings?: string[];
  dryRun?: boolean;
};

export type GoogleServiceConfigMap = Record<string, string | number | boolean | null | undefined>;

export type GooglePlatformServiceState = {
  configuration: GoogleServiceConfigMap;
  policy: Partial<GoogleOperationalPolicy>;
  connection?: Partial<GoogleConnectionSnapshot>;
  monitoring?: Partial<GoogleMonitoringSnapshot>;
  schemaVersion: number;
  migrationVersion: number;
};

export type GooglePlatformState = {
  global: GoogleGlobalSettings;
  services: Partial<Record<GoogleIntegrationId, GooglePlatformServiceState>>;
  events: GoogleLifecycleEvent[];
  history: GoogleHistoryEntry[];
  contractVersion: number;
};

export type GoogleIntegrationContext = {
  platform: GooglePlatformState;
  /** Legacy SEO integrations config (credentials). */
  legacyIntegrations?: {
    google?: Record<string, unknown>;
    bing?: Record<string, unknown>;
    indexnow?: Record<string, unknown>;
  };
  tracking?: Record<string, unknown>;
  env?: {
    gaId?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
  };
};

export type GoogleHealthProvider = {
  evaluate(ctx: GoogleIntegrationContext): Promise<GoogleHealthSnapshot> | GoogleHealthSnapshot;
};

export type GoogleQuotaProvider = {
  evaluate(ctx: GoogleIntegrationContext): Promise<GoogleQuotaSnapshot | null> | GoogleQuotaSnapshot | null;
};

export type GoogleAutomationProvider = {
  resolvePolicy(ctx: GoogleIntegrationContext): GoogleOperationalPolicy;
};

export type GoogleValidationHandler = {
  validate(
    ctx: GoogleIntegrationContext,
    options?: { dryRun?: boolean },
  ): Promise<GoogleValidationResult> | GoogleValidationResult;
};

export type GoogleOperationHandler = (
  ctx: GoogleIntegrationContext,
  params: Record<string, unknown>,
  options?: { dryRun?: boolean },
) => Promise<GoogleOperationResult> | GoogleOperationResult;

export type GoogleIntegrationDefinition = {
  id: GoogleIntegrationId;
  displayName: string;
  icon: string;
  category: GoogleIntegrationCategory;
  description: string;
  requiredScopes: string[];
  capabilities: GoogleIntegrationCapabilities;
  operations: GoogleOperationDefinition[];
  configurationSchema: GoogleConfigurationSchema;
  defaultPolicy: GoogleOperationalPolicy;
  dependencies: GoogleDependency[];
  contractVersion: number;
  schemaVersion: number;
  migrationVersion: number;
  /** Maps to Search Ops connector id when different naming is used. */
  connectorId?: string;
  tabId: string;
  healthProvider: GoogleHealthProvider;
  quotaProvider: GoogleQuotaProvider;
  automationProvider: GoogleAutomationProvider;
  validationHandler: GoogleValidationHandler;
  operationHandlers: Record<string, GoogleOperationHandler>;
  /** Derive connection snapshot from platform + legacy config. */
  resolveConnection(ctx: GoogleIntegrationContext): GoogleConnectionSnapshot;
  /** Whether the service is considered configured/connected for readiness. */
  isConfigured(ctx: GoogleIntegrationContext): boolean;
};

export const GOOGLE_PLATFORM_CONTRACT_VERSION = 1;

export const DEFAULT_OPERATIONAL_POLICY: GoogleOperationalPolicy = {
  cadenceMinutes: 60,
  retryCount: 3,
  retryBackoffMs: 5000,
  timeoutMs: 30000,
  parallelRequests: 2,
  workerEnabled: true,
  dryRunDefault: false,
  rateLimitPerMinute: 60,
  notificationOnFailure: true,
  notificationOnQuotaWarning: true,
  errorRecovery: "auto_retry",
};

export const DEFAULT_GLOBAL_SETTINGS: GoogleGlobalSettings = {
  secretRotationDays: 90,
  globalRateLimitPerMinute: 120,
  defaultRetryPolicy: { retryCount: 3, retryBackoffMs: 5000 },
  defaultWorkerPolicy: { workerEnabled: true, parallelRequests: 2, timeoutMs: 30000 },
  notificationChannels: [],
  loggingRetentionDays: 30,
  defaultTimeoutMs: 30000,
  environmentValidated: false,
  lastValidatedAt: null,
};

export function emptyPlatformState(): GooglePlatformState {
  return {
    global: { ...DEFAULT_GLOBAL_SETTINGS },
    services: {},
    events: [],
    history: [],
    contractVersion: GOOGLE_PLATFORM_CONTRACT_VERSION,
  };
}
