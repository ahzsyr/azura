import type { SeoIntegrationProviderConfig } from "@/features/seo/types";
import type { SeoIntegrationProvider, SeoSubmitResult } from "./types";

function configuredResult(provider: SeoIntegrationProvider, config?: SeoIntegrationProviderConfig) {
  const configured = provider.isConfigured(config);
  return {
    provider: provider.id,
    enabled: Boolean(config?.enabled),
    configured,
    ok: Boolean(config?.enabled && configured),
    message: configured ? "Configured" : "Missing credentials or site URL",
  };
}

async function fetchJson(url: string, init: RequestInit): Promise<SeoSubmitResult> {
  const response = await fetch(url, init);
  const body = await response.text().catch(() => "");
  return {
    ok: response.ok,
    status: response.status,
    message: response.ok ? "Submitted" : body.slice(0, 500) || response.statusText,
  };
}

function normalizeSiteUrl(config: SeoIntegrationProviderConfig, fallback: string) {
  return (config.siteUrl || fallback).replace(/\/$/, "");
}

export const indexNowProvider: SeoIntegrationProvider = {
  id: "indexnow",
  label: "IndexNow",
  isConfigured(config) {
    return Boolean(config?.enabled && config.apiKey?.trim());
  },
  async health(config) {
    return configuredResult(this, config);
  },
  async submitUrl(config, input) {
    const endpoint = config.endpoint?.trim() || "https://api.indexnow.org/indexnow";
    const siteUrl = normalizeSiteUrl(config, input.siteUrl);
    return fetchJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key: config.apiKey,
        keyLocation: config.keyLocation || `${siteUrl}/${config.apiKey}.txt`,
        urlList: [input.url],
      }),
    });
  },
  async submitSitemap(config, input) {
    return this.submitUrl(config, input);
  },
};

export const bingProvider: SeoIntegrationProvider = {
  id: "bing",
  label: "Bing Webmaster",
  isConfigured(config) {
    return Boolean(config?.enabled && config.apiKey?.trim() && config.siteUrl?.trim());
  },
  async health(config) {
    return configuredResult(this, config);
  },
  async submitUrl(config, input) {
    const siteUrl = normalizeSiteUrl(config, input.siteUrl);
    const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${encodeURIComponent(
      config.apiKey ?? ""
    )}`;
    return fetchJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ siteUrl, url: input.url }),
    });
  },
  async submitSitemap(config, input) {
    const siteUrl = normalizeSiteUrl(config, input.siteUrl);
    const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=${encodeURIComponent(
      config.apiKey ?? ""
    )}`;
    return fetchJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ siteUrl, feedUrl: input.url }),
    });
  },
};

export const googleProvider: SeoIntegrationProvider = {
  id: "google",
  label: "Google Search Console",
  isConfigured(config) {
    return Boolean(config?.enabled && config.siteUrl?.trim() && config.bearerToken?.trim());
  },
  async health(config) {
    return configuredResult(this, config);
  },
  async submitUrl() {
    return {
      ok: false,
      message:
        "Google Search Console does not provide generic URL submission; submit the sitemap instead.",
    };
  },
  async submitSitemap(config, input) {
    const siteUrl = normalizeSiteUrl(config, input.siteUrl);
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/sitemaps/${encodeURIComponent(input.url)}`;
    return fetchJson(endpoint, {
      method: "PUT",
      headers: { authorization: `Bearer ${config.bearerToken}` },
    });
  },
};

export const SEO_INTEGRATION_PROVIDERS = [
  indexNowProvider,
  bingProvider,
  googleProvider,
] as const;
