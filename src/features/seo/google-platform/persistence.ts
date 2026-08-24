import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SEO_GOOGLE_PLATFORM_NAMESPACE } from "@/features/seo/constants";
import type { GooglePlatformState, GoogleGlobalSettings, GoogleIntegrationId, GoogleOperationalPolicy, GoogleServiceConfigMap } from "./types";
import { emptyPlatformState, DEFAULT_GLOBAL_SETTINGS } from "./types";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";

function sealGlobal(global: GoogleGlobalSettings): GoogleGlobalSettings {
  return {
    ...global,
    oauthClientSecret: sealSecret(global.oauthClientSecret),
    sharedServiceAccountJson: sealSecret(global.sharedServiceAccountJson),
  };
}

function unsealGlobal(global: GoogleGlobalSettings): GoogleGlobalSettings {
  return {
    ...global,
    oauthClientSecret: unsealSecret(global.oauthClientSecret),
    sharedServiceAccountJson: unsealSecret(global.sharedServiceAccountJson),
  };
}

function sealServiceConfig(config: GoogleServiceConfigMap): GoogleServiceConfigMap {
  const next = { ...config };
  for (const key of Object.keys(next)) {
    if (
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("token") ||
      key === "apiKey" ||
      key === "serviceAccountJson" ||
      key === "developerToken"
    ) {
      const value = next[key];
      if (typeof value === "string") next[key] = sealSecret(value);
    }
  }
  return next;
}

function unsealServiceConfig(config: GoogleServiceConfigMap): GoogleServiceConfigMap {
  const next = { ...config };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (typeof value === "string") next[key] = unsealSecret(value);
  }
  return next;
}

function sealState(state: GooglePlatformState): GooglePlatformState {
  const services: GooglePlatformState["services"] = {};
  for (const [id, svc] of Object.entries(state.services)) {
    if (!svc) continue;
    services[id as GoogleIntegrationId] = {
      ...svc,
      configuration: sealServiceConfig(svc.configuration),
    };
  }
  return {
    ...state,
    global: sealGlobal(state.global),
    services,
  };
}

function unsealState(state: GooglePlatformState): GooglePlatformState {
  const services: GooglePlatformState["services"] = {};
  for (const [id, svc] of Object.entries(state.services)) {
    if (!svc) continue;
    services[id as GoogleIntegrationId] = {
      ...svc,
      configuration: unsealServiceConfig(svc.configuration),
    };
  }
  return {
    ...state,
    global: unsealGlobal({ ...DEFAULT_GLOBAL_SETTINGS, ...state.global }),
    services,
  };
}

export function redactPlatformState(state: GooglePlatformState): GooglePlatformState {
  const global = { ...state.global };
  const hasOauthSecret = Boolean(global.oauthClientSecret?.trim());
  const hasSa = Boolean(global.sharedServiceAccountJson?.trim());
  delete (global as { oauthClientSecret?: string }).oauthClientSecret;
  delete (global as { sharedServiceAccountJson?: string }).sharedServiceAccountJson;

  const services: GooglePlatformState["services"] = {};
  for (const [id, svc] of Object.entries(state.services)) {
    if (!svc) continue;
    const configuration: GoogleServiceConfigMap = { ...svc.configuration };
    for (const key of Object.keys(configuration)) {
      if (
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token") ||
        key === "apiKey" ||
        key === "serviceAccountJson" ||
        key === "developerToken"
      ) {
        const present = Boolean(configuration[key]);
        configuration[key] = undefined;
        configuration[`has_${key}`] = present;
      }
    }
    services[id as GoogleIntegrationId] = { ...svc, configuration };
  }

  return {
    ...state,
    global: {
      ...global,
      // keep presence flags via environmentValidated fields only
    },
    services,
    // expose secret presence without values
    ...(hasOauthSecret || hasSa
      ? {
          global: {
            ...global,
            oauthClientId: global.oauthClientId,
          },
        }
      : {}),
  };
}

export async function getGooglePlatformState(): Promise<GooglePlatformState> {
  try {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_GOOGLE_PLATFORM_NAMESPACE, key: "config" },
      },
    });
    if (!row?.data) return emptyPlatformState();
    return unsealState(row.data as GooglePlatformState);
  } catch {
    return emptyPlatformState();
  }
}

export async function getPublicGooglePlatformState(): Promise<GooglePlatformState> {
  return redactPlatformState(await getGooglePlatformState());
}

export async function upsertGooglePlatformState(state: GooglePlatformState): Promise<void> {
  const sealed = sealState(state);
  await prisma.jsonStore.upsert({
    where: {
      namespace_key: { namespace: SEO_GOOGLE_PLATFORM_NAMESPACE, key: "config" },
    },
    create: {
      namespace: SEO_GOOGLE_PLATFORM_NAMESPACE,
      key: "config",
      data: sealed as unknown as Prisma.InputJsonValue,
    },
    update: {
      data: sealed as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateGlobalSettings(
  partial: Partial<GoogleGlobalSettings>,
): Promise<GooglePlatformState> {
  const current = await getGooglePlatformState();
  const next: GooglePlatformState = {
    ...current,
    global: {
      ...current.global,
      ...partial,
      defaultRetryPolicy: {
        ...current.global.defaultRetryPolicy,
        ...partial.defaultRetryPolicy,
      },
      defaultWorkerPolicy: {
        ...current.global.defaultWorkerPolicy,
        ...partial.defaultWorkerPolicy,
      },
    },
  };
  // Preserve secrets when empty strings submitted
  if (!partial.oauthClientSecret?.trim()) {
    next.global.oauthClientSecret = current.global.oauthClientSecret;
  }
  if (!partial.sharedServiceAccountJson?.trim()) {
    next.global.sharedServiceAccountJson = current.global.sharedServiceAccountJson;
  }
  await upsertGooglePlatformState(next);
  return next;
}

export async function updateServiceConfiguration(
  integrationId: GoogleIntegrationId,
  configuration: GoogleServiceConfigMap,
): Promise<GooglePlatformState> {
  const current = await getGooglePlatformState();
  const existing = current.services[integrationId];
  const mergedConfig = { ...(existing?.configuration ?? {}) };
  for (const [key, value] of Object.entries(configuration)) {
    if (
      (key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token") ||
        key === "apiKey" ||
        key === "serviceAccountJson" ||
        key === "developerToken") &&
      (value === "" || value == null)
    ) {
      continue; // keep existing secret
    }
    mergedConfig[key] = value;
  }
  const next: GooglePlatformState = {
    ...current,
    services: {
      ...current.services,
      [integrationId]: {
        configuration: mergedConfig,
        policy: existing?.policy ?? {},
        connection: existing?.connection,
        monitoring: existing?.monitoring,
        schemaVersion: existing?.schemaVersion ?? 1,
        migrationVersion: existing?.migrationVersion ?? 1,
      },
    },
  };
  await upsertGooglePlatformState(next);
  return next;
}

export async function updateServicePolicy(
  integrationId: GoogleIntegrationId,
  policy: Partial<GoogleOperationalPolicy>,
): Promise<GooglePlatformState> {
  const current = await getGooglePlatformState();
  const existing = current.services[integrationId];
  const next: GooglePlatformState = {
    ...current,
    services: {
      ...current.services,
      [integrationId]: {
        configuration: existing?.configuration ?? {},
        policy: { ...(existing?.policy ?? {}), ...policy },
        connection: existing?.connection,
        monitoring: existing?.monitoring,
        schemaVersion: existing?.schemaVersion ?? 1,
        migrationVersion: existing?.migrationVersion ?? 1,
      },
    },
  };
  await upsertGooglePlatformState(next);
  return next;
}
