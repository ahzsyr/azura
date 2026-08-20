import type {
  GoogleConnectionSnapshot,
  GoogleGlobalSettings,
  GoogleIntegrationContext,
  GoogleIntegrationId,
  GooglePlatformState,
} from "./types";
import { DEFAULT_GLOBAL_SETTINGS, emptyPlatformState } from "./types";
import { emitEvent } from "./events";

export type ConnectionCredentials = {
  method: "oauth" | "api_key" | "service_account";
  bearerToken?: string;
  refreshToken?: string;
  apiKey?: string;
  serviceAccountJson?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  account?: string;
  project?: string;
  tokenExpiresAt?: string;
};

/**
 * Shared connection subsystem for all Google integrations.
 * OAuth start/callback still live in API routes; this manager owns connection state transitions.
 */
export function createGoogleConnectionManager(initial?: GooglePlatformState) {
  let state = initial ?? emptyPlatformState();

  function snapshot(): GooglePlatformState {
    return state;
  }

  function setGlobal(partial: Partial<GoogleGlobalSettings>) {
    state = {
      ...state,
      global: { ...state.global, ...partial },
    };
    state = emitEvent(state, "ConfigUpdated", "global", "Global Google settings updated");
    return state;
  }

  function ensureService(integrationId: GoogleIntegrationId) {
    if (!state.services[integrationId]) {
      state = {
        ...state,
        services: {
          ...state.services,
          [integrationId]: {
            configuration: {},
            policy: {},
            connection: { state: "disconnected", grantedScopes: [], missingScopes: [] },
            schemaVersion: 1,
            migrationVersion: 1,
          },
        },
      };
    }
  }

  function connect(integrationId: GoogleIntegrationId, credentials: ConnectionCredentials) {
    ensureService(integrationId);
    const current = state.services[integrationId]!;
    const connection: GoogleConnectionSnapshot = {
      state: "connected",
      lastVerifiedAt: new Date().toISOString(),
      account: credentials.account ?? null,
      project: credentials.project ?? state.global.defaultCloudProjectId ?? null,
      grantedScopes: credentials.scopes ?? [],
      missingScopes: [],
      authMethod: credentials.method,
      message: "Connected",
    };
    state = {
      ...state,
      services: {
        ...state.services,
        [integrationId]: {
          ...current,
          connection,
          configuration: {
            ...current.configuration,
            ...(credentials.apiKey ? { apiKey: credentials.apiKey } : {}),
            ...(credentials.serviceAccountJson
              ? { serviceAccountJson: credentials.serviceAccountJson }
              : {}),
          },
        },
      },
    };
    state = emitEvent(state, "ConnectionCreated", integrationId, `Connected via ${credentials.method}`);
    return connection;
  }

  function disconnect(integrationId: GoogleIntegrationId) {
    ensureService(integrationId);
    const current = state.services[integrationId]!;
    const connection: GoogleConnectionSnapshot = {
      state: "disconnected",
      lastVerifiedAt: current.connection?.lastVerifiedAt ?? null,
      account: null,
      project: null,
      grantedScopes: [],
      missingScopes: [],
      authMethod: "none",
      message: "Disconnected",
    };
    state = {
      ...state,
      services: {
        ...state.services,
        [integrationId]: { ...current, connection },
      },
    };
    state = emitEvent(state, "ConnectionLost", integrationId, "Connection disconnected");
    return connection;
  }

  function markVerified(integrationId: GoogleIntegrationId, ok: boolean, message: string) {
    ensureService(integrationId);
    const current = state.services[integrationId]!;
    const connection: GoogleConnectionSnapshot = {
      state: ok ? "connected" : "error",
      lastVerifiedAt: new Date().toISOString(),
      account: current.connection?.account ?? null,
      project: current.connection?.project ?? null,
      grantedScopes: current.connection?.grantedScopes ?? [],
      missingScopes: current.connection?.missingScopes ?? [],
      authMethod: current.connection?.authMethod ?? "none",
      message,
    };
    state = {
      ...state,
      services: {
        ...state.services,
        [integrationId]: { ...current, connection },
      },
    };
    state = emitEvent(
      state,
      ok ? "ValidationPassed" : "ValidationFailed",
      integrationId,
      message,
    );
    return connection;
  }

  function resolveOAuthClient(ctx?: GoogleIntegrationContext) {
    return {
      clientId:
        state.global.oauthClientId?.trim() ||
        ctx?.env?.oauthClientId?.trim() ||
        (typeof ctx?.legacyIntegrations?.google?.clientId === "string"
          ? ctx.legacyIntegrations.google.clientId
          : undefined) ||
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() ||
        undefined,
      clientSecret:
        state.global.oauthClientSecret?.trim() ||
        ctx?.env?.oauthClientSecret?.trim() ||
        (typeof ctx?.legacyIntegrations?.google?.clientSecret === "string"
          ? ctx.legacyIntegrations.google.clientSecret
          : undefined) ||
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim() ||
        undefined,
    };
  }

  function updateScopes(
    integrationId: GoogleIntegrationId,
    granted: string[],
    required: string[],
  ) {
    ensureService(integrationId);
    const current = state.services[integrationId]!;
    const missing = required.filter((s) => !granted.includes(s));
    const connection: GoogleConnectionSnapshot = {
      ...(current.connection as GoogleConnectionSnapshot),
      state: current.connection?.state === "connected" && missing.length === 0 ? "connected" : current.connection?.state ?? "disconnected",
      grantedScopes: granted,
      missingScopes: missing,
      message:
        missing.length > 0
          ? `Missing scopes: ${missing.join(", ")}`
          : current.connection?.message ?? "Scopes up to date",
    };
    state = {
      ...state,
      services: {
        ...state.services,
        [integrationId]: { ...current, connection },
      },
    };
    return connection;
  }

  return {
    snapshot,
    replaceState(next: GooglePlatformState) {
      state = next;
      return state;
    },
    setGlobal,
    connect,
    disconnect,
    markVerified,
    resolveOAuthClient,
    updateScopes,
    getDefaults: () => ({ ...DEFAULT_GLOBAL_SETTINGS, ...state.global }),
  };
}

export type GoogleConnectionManager = ReturnType<typeof createGoogleConnectionManager>;
