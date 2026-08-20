import type { SeoIntegrationProviderConfig } from "@/features/seo/types";
import type {
  SeoIntegrationHealthOptions,
  SeoIntegrationProvider,
  SeoSubmitResult,
} from "./types";
import {
  googleHealthMessage,
  isGoogleIntegrationHealthy,
} from "@/features/seo/admin/google-integration-readiness";
import { normalizeGscSiteUrl } from "@/features/seo/admin/google-gsc-site-url";
import { refreshGoogleToken } from "./google-auth";
import { verifyGoogleIntegrationAccess, resolveConfiguredGscSiteUrl } from "./google-verify";
import { normalizeWiredCmsAbsoluteUrl } from "@/features/cms/cms-page-path";
import { validateServiceAccountJson } from "@/features/seo/google-live/service-account-json";
import { submitIndexNowUrls } from "./indexnow-submit";

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
    return submitIndexNowUrls(config, [input.url], input.siteUrl);
  },
  async submitSitemap() {
    return {
      ok: true,
      message: "Skipped: IndexNow accepts page URLs only (use Bing/GSC for sitemap submission)",
    };
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
    const url = normalizeWiredCmsAbsoluteUrl(input.url);
    const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${encodeURIComponent(
      config.apiKey ?? ""
    )}`;
    return fetchJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ siteUrl, url }),
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
  async health(config, options) {
    const configured = this.isConfigured(config);
    if (!configured) {
      return {
        provider: this.id,
        enabled: Boolean(config?.enabled),
        configured,
        ok: false,
        message: googleHealthMessage(config),
      };
    }

    if (options?.liveGoogle === false) {
      return {
        provider: this.id,
        enabled: Boolean(config?.enabled),
        configured,
        ok: Boolean(config?.enabled && configured),
        message: googleHealthMessage(config),
      };
    }

    let verification;
    try {
      verification = await verifyGoogleIntegrationAccess(config!, { timeoutMs: 8000 });
    } catch (error) {
      const timedOut = error instanceof Error && error.message === "GOOGLE_VERIFY_TIMEOUT";
      return {
        provider: this.id,
        enabled: Boolean(config?.enabled),
        configured,
        ok: Boolean(config?.enabled && configured),
        message: timedOut
          ? `${googleHealthMessage(config)} · Live API check timed out`
          : googleHealthMessage(config),
      };
    }

    return {
      provider: this.id,
      enabled: Boolean(config?.enabled),
      configured,
      ok: Boolean(config?.enabled && isGoogleIntegrationHealthy(config, verification)),
      message: googleHealthMessage(config, verification),
    };
  },
  async submitUrl() {
    return {
      ok: true,
      message: "Skipped: Google Search Console uses sitemap submission only",
    };
  },
  async submitSitemap(config, input) {
    const fallbackSiteUrl = normalizeGscSiteUrl(config.siteUrl || input.siteUrl);
    let siteUrl = fallbackSiteUrl;
    let token = config.bearerToken?.trim();
    try {
      token = (await refreshGoogleToken(config))?.trim() ?? token;
      if (token) {
        siteUrl = await resolveConfiguredGscSiteUrl(config, token);
      }
    } catch {
      // Fall back to configured site URL when token refresh or site lookup fails.
    }
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/sitemaps/${encodeURIComponent(input.url)}`;
    return fetchJson(endpoint, {
      method: "PUT",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  },
};

export const googleIndexingProvider: SeoIntegrationProvider = {
  id: "google_indexing",
  label: "Google Indexing API",
  isConfigured(config) {
    if (!config?.enabled) return false;
    if (!config.serviceAccountJson?.trim()) return false;
    return validateServiceAccountJson(config.serviceAccountJson).ok;
  },
  async health(config) {
    const enabled = Boolean(config?.enabled);
    if (!enabled) {
      return {
        provider: this.id,
        enabled: false,
        configured: false,
        ok: false,
        message: "Disabled",
      };
    }
    const json = config?.serviceAccountJson?.trim();
    if (!json) {
      return {
        provider: this.id,
        enabled: true,
        configured: false,
        ok: false,
        message: "Service account JSON required",
      };
    }
    const validation = validateServiceAccountJson(json);
    return {
      provider: this.id,
      enabled: true,
      configured: validation.ok,
      ok: validation.ok,
      message: validation.ok ? "Service account configured" : validation.message,
    };
  },
  async submitUrl() {
    return {
      ok: true,
      message: "Skipped: Indexing API runs through Search Operations queue, not URL submission jobs",
    };
  },
  async submitSitemap() {
    return {
      ok: true,
      message: "Skipped: use Search Console sitemap submission for sitemaps",
    };
  },
};

export const SEO_INTEGRATION_PROVIDERS = [
  indexNowProvider,
  bingProvider,
  googleIndexingProvider,
  googleProvider,
] as const;
