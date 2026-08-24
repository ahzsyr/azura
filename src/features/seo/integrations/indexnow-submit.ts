import type { SeoIntegrationProviderConfig } from "@/features/seo/types";
import type { SeoSubmitResult } from "./types";
import {
  buildIndexNowBatchPayload,
  isIndexNowHostMismatchError,
  resolveIndexNowPublicOrigin,
  type IndexNowPayload,
  type IndexNowPayloadConfig,
} from "./indexnow-payload";
import { probeIndexNowVerifiedOrigin } from "./indexnow-verify-origin";

export type IndexNowSubmitResult = SeoSubmitResult & {
  host?: string;
  keyLocation?: string;
  urlCount: number;
};

function endpointFor(config: IndexNowPayloadConfig): string {
  return config.endpoint?.trim() || "https://api.indexnow.org/indexnow";
}

async function postPayload(endpoint: string, payload: IndexNowPayload): Promise<SeoSubmitResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await response.text().catch(() => "");
  return {
    ok: response.ok || response.status === 202,
    status: response.status,
    message: response.ok || response.status === 202 ? "Submitted" : body.slice(0, 500) || response.statusText,
  };
}

function withPayloadMeta(result: SeoSubmitResult, payload: IndexNowPayload): IndexNowSubmitResult {
  return {
    ...result,
    host: payload.host,
    keyLocation: payload.keyLocation,
    urlCount: payload.urlList.length,
  };
}

/**
 * Submit page URLs to IndexNow with host + keyLocation aligned to the public
 * non-redirecting origin. Retries once on www/apex mismatch errors.
 */
export async function submitIndexNowUrls(
  config: SeoIntegrationProviderConfig,
  urls: string[],
  preferredOrigin?: string,
): Promise<IndexNowSubmitResult> {
  const payloadConfig: IndexNowPayloadConfig = config;
  const pageUrl = urls[0] ?? preferredOrigin ?? "";
  const verifiedOrigin = await probeIndexNowVerifiedOrigin({
    pageUrl,
    config: payloadConfig,
    preferredOrigin,
  });
  const endpoint = endpointFor(payloadConfig);
  const payload = buildIndexNowBatchPayload(payloadConfig, urls, verifiedOrigin);
  const first = await postPayload(endpoint, payload);
  if (first.ok || !isIndexNowHostMismatchError(first.message)) {
    return withPayloadMeta(first, payload);
  }

  const publicOrigin = resolveIndexNowPublicOrigin(pageUrl, payloadConfig, preferredOrigin);
  const retryOrigin =
    publicOrigin && publicOrigin !== `https://${payload.host}` && publicOrigin !== `http://${payload.host}`
      ? publicOrigin
      : verifiedOrigin;
  const retryPayload = buildIndexNowBatchPayload(payloadConfig, urls, retryOrigin);
  if (retryPayload.host === payload.host && retryPayload.keyLocation === payload.keyLocation) {
    return withPayloadMeta(first, payload);
  }
  const second = await postPayload(endpoint, retryPayload);
  return withPayloadMeta(second, retryPayload);
}
