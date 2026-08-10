import "server-only";
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
};

export type PublicMarketingProviderAppConfig = {
  providerId: string;
  clientId: string;
  hasClientSecret: boolean;
  hasAppSecret: boolean;
  hasWebhookVerifyToken: boolean;
  pixelId: string;
  hasCapiAccessToken: boolean;
};

function blankToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function getProviderAppCredentials(
  providerId: string,
): Promise<MarketingProviderAppCredentials> {
  const row = await prisma.marketingProviderAppConfig.findUnique({ where: { providerId } }).catch(() => null);
  if (!row) return { providerId };

  return {
    providerId,
    clientId: blankToUndefined(row.clientId),
    clientSecret: unsealSecret(row.clientSecret),
    appSecret: unsealSecret(row.appSecret),
    webhookVerifyToken: unsealSecret(row.webhookVerifyToken),
    pixelId: blankToUndefined(row.pixelId),
    capiAccessToken: unsealSecret(row.capiAccessToken),
  };
}

export async function getPublicProviderAppConfig(
  providerId: string,
): Promise<PublicMarketingProviderAppConfig> {
  const creds = await getProviderAppCredentials(providerId);
  return {
    providerId,
    clientId: creds.clientId ?? "",
    hasClientSecret: Boolean(creds.clientSecret),
    hasAppSecret: Boolean(creds.appSecret),
    hasWebhookVerifyToken: Boolean(creds.webhookVerifyToken),
    pixelId: creds.pixelId ?? "",
    hasCapiAccessToken: Boolean(creds.capiAccessToken),
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
    },
    update: {
      clientId,
      clientSecret: nextClientSecret,
      appSecret: nextAppSecret,
      webhookVerifyToken: nextWebhookToken,
      pixelId,
      capiAccessToken: nextCapiToken,
    },
  });

  // Keep tracking config pixel/token in sync for Meta when provided.
  if (input.providerId === "meta" && (pixelId || nextCapiToken)) {
    await prisma.marketingTrackingConfig.upsert({
      where: { providerId: "meta" },
      create: {
        providerId: "meta",
        enabled: Boolean(pixelId),
        pixelId,
        capiEnabled: Boolean(nextCapiToken),
        accessToken: nextCapiToken,
      },
      update: {
        ...(pixelId !== undefined ? { pixelId } : {}),
        ...(input.capiAccessToken?.trim()
          ? { accessToken: nextCapiToken, capiEnabled: true }
          : {}),
      },
    }).catch(() => null);
  }

  return row;
}
