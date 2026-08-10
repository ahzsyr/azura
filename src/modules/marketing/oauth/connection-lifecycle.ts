import "server-only";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getProviderManifest } from "@/modules/marketing/core/registry";
import { assertLifecycleTransition } from "@/modules/marketing/core/lifecycle";
import { buildPermissionEntries, summarizePermissions } from "@/modules/marketing/core/permissions";
import type { ProviderLifecycleState } from "@/modules/marketing/core/manifests/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
export async function ensureProviderRuntime(providerId: string) {
  const manifest = getProviderManifest(providerId);
  return prisma.marketingProviderRuntime.upsert({
    where: { providerId },
    create: {
      providerId,
      enabled: true,
      installedVersion: manifest?.version.sdkVersion ?? "1.0.0",
      lifecycle: "discovered",
    },
    update: {},
  });
}

export async function upsertConnectionFromOAuth(params: {
  providerId: string;
  tenantId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  grantedScopes: string[];
  oauthMetadata?: Record<string, unknown>;
}) {
  await ensureProviderRuntime(params.providerId);
  const manifest = getProviderManifest(params.providerId);
  const required = manifest?.oauthConfig.scopes ?? [];
  const entries = buildPermissionEntries(required, params.grantedScopes);
  const summary = summarizePermissions(entries);
  const tenantId = params.tenantId ?? "default";

  const connection = await prisma.marketingConnection.upsert({
    where: {
      providerId_tenantId: {
        providerId: params.providerId,
        tenantId,
      },
    },
    create: {
      providerId: params.providerId,
      tenantId,
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: asJson(params.oauthMetadata ?? {}),
      scopesGranted: asJson(params.grantedScopes),
      scopesRequired: asJson(required),
      scopesMissing: asJson(summary.missing),
      scopesExpired: asJson(summary.expired),
      lastHealthAt: new Date(),
    },
    update: {
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: asJson(params.oauthMetadata ?? {}),
      scopesGranted: asJson(params.grantedScopes),
      scopesRequired: asJson(required),
      scopesMissing: asJson(summary.missing),
      scopesExpired: asJson(summary.expired),
      lastHealthAt: new Date(),
    },
  });

  await prisma.marketingCredential.upsert({
    where: { connectionId: connection.id },
    create: {
      connectionId: connection.id,
      accessToken: sealSecret(params.accessToken) ?? "",
      refreshToken: sealSecret(params.refreshToken) ?? null,
      expiresAt: params.expiresAt ?? null,
      refreshStatus: "ok",
    },
    update: {
      accessToken: sealSecret(params.accessToken) ?? "",
      refreshToken: sealSecret(params.refreshToken) ?? null,
      expiresAt: params.expiresAt ?? null,
      refreshStatus: "ok",
    },
  });

  await prisma.marketingPermissionState.upsert({
    where: {
      providerId_connectionId: {
        providerId: params.providerId,
        connectionId: connection.id,
      },
    },
    create: {
      providerId: params.providerId,
      connectionId: connection.id,
      entries: asJson(entries),
      lastCheckedAt: new Date(),
    },
    update: {
      entries: asJson(entries),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.marketingProviderRuntime.update({
    where: { providerId: params.providerId },
    data: { lifecycle: "connected", lastSyncAt: new Date() },
  });

  return connection;
}

export async function getUnsealedAccessToken(connectionId: string) {
  const credential = await prisma.marketingCredential.findUnique({ where: { connectionId } });
  if (!credential) return undefined;
  return unsealSecret(credential.accessToken);
}

export async function transitionConnectionLifecycle(
  connectionId: string,
  to: ProviderLifecycleState,
) {
  const connection = await prisma.marketingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  assertLifecycleTransition(connection.lifecycle as ProviderLifecycleState, to);
  return prisma.marketingConnection.update({
    where: { id: connectionId },
    data: { lifecycle: to, status: to === "disconnected" ? "disconnected" : connection.status },
  });
}

export async function syncAccountsForConnection(
  connectionId: string,
  accounts: Array<{
    externalId: string;
    name: string;
    type: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  const results = [];
  for (const account of accounts) {
    const row = await prisma.marketingAccount.upsert({
      where: {
        connectionId_externalAccountId: {
          connectionId,
          externalAccountId: account.externalId,
        },
      },
      create: {
        connectionId,
        externalAccountId: account.externalId,
        accountType: account.type,
        displayName: account.name,
        metadata: asJson(account.metadata ?? {}),
      },
      update: {
        accountType: account.type,
        displayName: account.name,
        metadata: asJson(account.metadata ?? {}),
      },
    });
    results.push(row);
  }
  return results;
}
