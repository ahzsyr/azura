import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";

export type MarketingProviderAppCredentials = {
  providerId: string;
  clientId?: string;
  clientSecret?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  pixelId?: string;
  capiAccessToken?: string;
  metadata?: Record<string, unknown>;
};

export type PublicMarketingProviderAppConfig = {
  providerId: string;
  clientId: string;
  hasClientSecret: boolean;
  hasAppSecret: boolean;
  hasWebhookVerifyToken: boolean;
  pixelId: string;
  hasCapiAccessToken: boolean;
  hasDeveloperToken?: boolean;
  hasLoginCustomerId?: boolean;
  loginCustomerIdMasked?: string;
};

function blankToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function unsealMetadataSecrets(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  if (typeof next.developerToken === "string") {
    next.developerToken = unsealSecret(next.developerToken) ?? next.developerToken;
  }
  return next;
}

function sealMetadataSecrets(
  metadata: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...(existing ?? {}), ...metadata };
  const incomingToken =
    typeof metadata.developerToken === "string" ? metadata.developerToken.trim() : "";
  if (incomingToken) {
    next.developerToken = sealSecret(incomingToken) ?? incomingToken;
  } else if (existing?.developerToken) {
    next.developerToken = existing.developerToken;
  } else {
    delete next.developerToken;
  }
  if (typeof metadata.loginCustomerId === "string") {
    const login = metadata.loginCustomerId.trim();
    if (login) next.loginCustomerId = login;
    else delete next.loginCustomerId;
  }
  return next;
}

export async function getProviderAppCredentials(
  providerId: string,
): Promise<MarketingProviderAppCredentials> {
  let row: Awaited<ReturnType<typeof prisma.marketingProviderAppConfig.findUnique>> = null;
  try {
    row = await prisma.marketingProviderAppConfig.findUnique({ where: { providerId } }).catch(() => null);
  } catch {
    return { providerId };
  }
  if (!row) return { providerId };

  const rawMetadata = (row.metadata as Record<string, unknown>) ?? {};
  return {
    providerId,
    clientId: blankToUndefined(row.clientId),
    clientSecret: unsealSecret(row.clientSecret),
    appSecret: unsealSecret(row.appSecret),
    webhookVerifyToken: unsealSecret(row.webhookVerifyToken),
    pixelId: blankToUndefined(row.pixelId),
    capiAccessToken: unsealSecret(row.capiAccessToken),
    metadata: unsealMetadataSecrets(rawMetadata),
  };
}

export async function getPublicProviderAppConfig(
  providerId: string,
): Promise<PublicMarketingProviderAppConfig> {
  let row: Awaited<ReturnType<typeof prisma.marketingProviderAppConfig.findUnique>> = null;
  try {
    row = await prisma.marketingProviderAppConfig.findUnique({ where: { providerId } }).catch(() => null);
  } catch {
    row = null;
  }
  const metadata = (row?.metadata as Record<string, unknown>) ?? {};
  const loginCustomerId =
    typeof metadata.loginCustomerId === "string" ? metadata.loginCustomerId.trim() : "";
  const hasDeveloperToken = Boolean(
    typeof metadata.developerToken === "string" && metadata.developerToken.trim(),
  );

  return {
    providerId,
    clientId: blankToUndefined(row?.clientId) ?? "",
    hasClientSecret: Boolean(unsealSecret(row?.clientSecret)),
    hasAppSecret: Boolean(unsealSecret(row?.appSecret)),
    hasWebhookVerifyToken: Boolean(unsealSecret(row?.webhookVerifyToken)),
    pixelId: blankToUndefined(row?.pixelId) ?? "",
    hasCapiAccessToken: Boolean(unsealSecret(row?.capiAccessToken)),
    hasDeveloperToken,
    hasLoginCustomerId: Boolean(loginCustomerId),
    loginCustomerIdMasked: loginCustomerId
      ? `${loginCustomerId.slice(0, 3)}…${loginCustomerId.slice(-4)}`
      : undefined,
  };
}

export async function listPublicProviderAppConfigs(providerIds: string[]) {
  return Promise.all(providerIds.map((id) => getPublicProviderAppConfig(id)));
}

export type UpsertProviderAppConfigInput = {
  providerId: string;
  clientId?: string;
  /** Empty string means keep existing secret. */
  clientSecret?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  pixelId?: string;
  capiAccessToken?: string;
  metadata?: Record<string, unknown>;
};

export async function upsertProviderAppConfig(input: UpsertProviderAppConfigInput) {
  const existing = await prisma.marketingProviderAppConfig.findUnique({
    where: { providerId: input.providerId },
  }).catch(() => null);

  const nextClientSecret = input.clientSecret?.trim()
    ? sealSecret(input.clientSecret)
    : existing?.clientSecret ?? null;
  const nextAppSecret = input.appSecret?.trim()
    ? sealSecret(input.appSecret)
    : existing?.appSecret ?? null;
  const nextWebhookToken = input.webhookVerifyToken?.trim()
    ? sealSecret(input.webhookVerifyToken)
    : existing?.webhookVerifyToken ?? null;
  const nextCapiToken = input.capiAccessToken?.trim()
    ? sealSecret(input.capiAccessToken)
    : existing?.capiAccessToken ?? null;

  const clientId =
    input.clientId !== undefined ? blankToUndefined(input.clientId) ?? null : existing?.clientId ?? null;
  const pixelId =
    input.pixelId !== undefined ? blankToUndefined(input.pixelId) ?? null : existing?.pixelId ?? null;

  const existingMetadata = (existing?.metadata as Record<string, unknown>) ?? {};
  const nextMetadata = input.metadata
    ? sealMetadataSecrets(input.metadata, existingMetadata)
    : existingMetadata;

  const row = await prisma.marketingProviderAppConfig.upsert({
    where: { providerId: input.providerId },
    create: {
      providerId: input.providerId,
      clientId,
      clientSecret: nextClientSecret,
      appSecret: nextAppSecret,
      webhookVerifyToken: nextWebhookToken,
      pixelId,
      capiAccessToken: nextCapiToken,
      metadata: nextMetadata as object,
    },
    update: {
      clientId,
      clientSecret: nextClientSecret,
      appSecret: nextAppSecret,
      webhookVerifyToken: nextWebhookToken,
      pixelId,
      capiAccessToken: nextCapiToken,
      ...(input.metadata ? { metadata: nextMetadata as object } : {}),
    },
  });

  // Keep tracking config pixel/token in sync for Meta when provided.
  if (input.providerId === "meta" && (pixelId || nextCapiToken)) {
    const { buildMetaPixelBaseCode } = await import("@/modules/marketing/tracking/meta-pixel");
    const existingTracking = await prisma.marketingTrackingConfig
      .findUnique({ where: { providerId: "meta" } })
      .catch(() => null);
    const existingMeta =
      existingTracking?.metadata &&
      typeof existingTracking.metadata === "object" &&
      !Array.isArray(existingTracking.metadata)
        ? { ...(existingTracking.metadata as Record<string, unknown>) }
        : {};
    const headSnippet =
      typeof existingMeta.headSnippet === "string" && existingMeta.headSnippet.trim()
        ? existingMeta.headSnippet
        : pixelId
          ? buildMetaPixelBaseCode(pixelId)
          : undefined;

    const createMetadata: Prisma.InputJsonValue = {
      setupMethod: "code",
      ...(headSnippet ? { headSnippet } : {}),
    };
    const updateMetadata: Prisma.InputJsonValue | undefined =
      pixelId && !existingMeta.headSnippet
        ? {
            setupMethod: "code",
            headSnippet: buildMetaPixelBaseCode(pixelId),
          }
        : undefined;

    await prisma.marketingTrackingConfig.upsert({
      where: { providerId: "meta" },
      create: {
        providerId: "meta",
        enabled: Boolean(pixelId),
        pixelId,
        capiEnabled: Boolean(nextCapiToken),
        accessToken: nextCapiToken,
        metadata: createMetadata,
      },
      update: {
        ...(pixelId !== undefined ? { pixelId } : {}),
        ...(input.capiAccessToken?.trim()
          ? { accessToken: nextCapiToken, capiEnabled: true }
          : {}),
        ...(updateMetadata ? { metadata: updateMetadata } : {}),
      },
    }).catch(() => null);
  }

  return row;
}
