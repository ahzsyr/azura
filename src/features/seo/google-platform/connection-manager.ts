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
  matchedGscSiteUrl?: string | null;
  propertyKind?: "domain" | "url_prefix" | null;
};

/** Preserve GSC property fields across connect / verify unless explicitly replaced. */
export function mergeConnectionSnapshot(
  existing: Partial<GoogleConnectionSnapshot> | undefined,
  updates: GoogleConnectionSnapshot,
): GoogleConnectionSnapshot {
  return {
    ...existing,
    ...updates,
    matchedGscSiteUrl:
      updates.matchedGscSiteUrl ?? existing?.matchedGscSiteUrl ?? null,
    propertyKind: updates.propertyKind ?? existing?.propertyKind ?? null,
  };
}

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
    const connection = mergeConnectionSnapshot(current.connection, {
      state: "connected",
      lastVerifiedAt: new Date().toISOString(),
      account: credentials.account ?? null,
      project: credentials.project ?? state.global.defaultCloudProjectId ?? null,
      grantedScopes: credentials.scopes ?? [],
      missingScopes: [],
      authMethod: credentials.method,
      message: "Connected",
      matchedGscSiteUrl: credentials.matchedGscSiteUrl,
      propertyKind: credentials.propertyKind,
    });
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
      matchedGscSiteUrl: null,
      propertyKind: null,
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
    const connection = mergeConnectionSnapshot(current.connection, {
      state: ok ? "connected" : "error",
      lastVerifiedAt: new Date().toISOString(),
      account: current.connection?.account ?? null,
      project: current.connection?.project ?? null,
      grantedScopes: current.connection?.grantedScopes ?? [],
      missingScopes: current.connection?.missingScopes ?? [],
      authMethod: current.connection?.authMethod ?? "none",
      message,
    });
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
    // Prefer a matched Client ID + Secret pair from one source.
    // Mixing global ID with legacy Secret (or vice versa) causes Google invalid_client.
    const globalId = state.global.oauthClientId?.trim() || "";
    const globalSecret = state.global.oauthClientSecret?.trim() || "";
    const legacyId =
      typeof ctx?.legacyIntegrations?.google?.clientId === "string"
        ? ctx.legacyIntegrations.google.clientId.trim()
        : "";
    const legacySecret =
      typeof ctx?.legacyIntegrations?.google?.clientSecret === "string"
        ? ctx.legacyIntegrations.google.clientSecret.trim()
        : "";

    if (globalId && globalSecret) {
      return { clientId: globalId, clientSecret: globalSecret };
    }
    if (legacyId && legacySecret) {
      return { clientId: legacyId, clientSecret: legacySecret };
    }
    // Incomplete pair — return whatever we have so callers can show missing_client errors
    return {
      clientId: globalId || legacyId || undefined,
      clientSecret: globalSecret || legacySecret || undefined,
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
