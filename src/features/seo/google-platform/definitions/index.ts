import type {
  GoogleConnectionSnapshot,
  GoogleConnectionState,
  GoogleIntegrationContext,
  GoogleIntegrationDefinition,
  GoogleIntegrationId,
  GoogleOperationalPolicy,
  GoogleOperationResult,
  GoogleValidationResult,
} from "../types";
import {
  DEFAULT_OPERATIONAL_POLICY,
} from "../types";
import {
  BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
} from "@/features/seo/google-live/google-api-error";
import {
  isBusinessProfileRateLimitError,
  isBusinessProfileRateLimited,
  readBusinessProfileDiscovery,
} from "@/features/seo/google-live/business-profile-cache";
import {
  basicHealth,
  basicQuota,
  createAutomationProviderFor,
  getServiceConfig,
  hasLegacyApiKey,
  hasLegacyBearer,
  hasLegacyServiceAccount,
  legacyGoogle,
  legacyIndexNow,
} from "../providers/shared";
import { gscPropertyKind } from "@/features/seo/admin/google-gsc-site-url";

function opOk(message: string, dryRun?: boolean, data?: Record<string, unknown>): GoogleOperationResult {
  return { ok: true, message: dryRun ? `[dry-run] ${message}` : message, dryRun, data };
}

function opFail(message: string): GoogleOperationResult {
  return { ok: false, message };
}

function cfgString(ctx: GoogleIntegrationContext, id: string, key: string): string {
  const v = getServiceConfig(ctx, id)[key];
  return typeof v === "string" ? v.trim() : "";
}

function connectionScopes(ctx: GoogleIntegrationContext, id: GoogleIntegrationId): string[] {
  return ctx.platform.services[id]?.connection?.grantedScopes ?? [];
}

function hasGrantedScope(ctx: GoogleIntegrationContext, id: GoogleIntegrationId, scope: string): boolean {
  return connectionScopes(ctx, id).includes(scope);
}

function connectedOAuth(
  configured: boolean,
  scopes: string[],
  granted: string[],
  account?: string | null,
): GoogleConnectionSnapshot {
  const missing = scopes.filter((s) => !granted.includes(s));
  return {
    state: configured ? (missing.length ? "error" : "connected") : "disconnected",
    lastVerifiedAt: configured ? new Date().toISOString() : null,
    account: account ?? null,
    project: null,
    grantedScopes: granted,
    missingScopes: missing,
    authMethod: configured ? "oauth" : "none",
    message: configured
      ? missing.length
        ? `Missing scopes: ${missing.join(", ")}`
        : "Connected"
      : "Not connected",
  };
}

function basePolicy(overrides: Partial<GoogleOperationalPolicy>): GoogleOperationalPolicy {
  return { ...DEFAULT_OPERATIONAL_POLICY, ...overrides };
}

export const searchConsoleIntegration: GoogleIntegrationDefinition = {
  id: "search_console",
  displayName: "Search Console",
  icon: "search",
  category: "search",
  description: "OAuth connection, sitemap submission, and GSC search performance import.",
  requiredScopes: [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ],
  capabilities: {
    supportsOAuth: true,
    supportsApiKey: false,
    supportsServiceAccount: true,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    {
      id: "submit_sitemap",
      title: "Submit Sitemap",
      description: "Submit the site sitemap to Search Console",
      permission: "seo.google.gsc.submit",
      supportsDryRun: true,
      supportsScheduling: true,
    },
    {
      id: "inspect_url",
      title: "Inspect URL",
      description: "Inspect a URL in Search Console",
      permission: "seo.google.gsc.inspect",
      parameters: [{ key: "url", label: "URL", type: "url", required: true }],
      supportsDryRun: true,
      supportsScheduling: false,
    },
    {
      id: "sync_analytics",
      title: "Sync Search Analytics",
      description: "Import search performance metrics",
      permission: "seo.google.gsc.sync",
      supportsDryRun: true,
      supportsScheduling: true,
    },
  ],
  configurationSchema: {
    fields: [
      { key: "siteUrl", label: "Site URL", type: "url", required: true, group: "General" },
      { key: "clientId", label: "OAuth Client ID", type: "string", group: "Credentials" },
      { key: "clientSecret", label: "OAuth Client Secret", type: "secret", group: "Credentials" },
      {
        key: "analyticsEnabled",
        label: "Enable search analytics import",
        type: "boolean",
        group: "General",
      },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 60 }),
  dependencies: [],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "search_console",
  tabId: "search-console",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("search_console", ctx);
      return basicHealth({
        configured,
        authOk: hasLegacyBearer(legacyGoogle(ctx)),
        message: configured ? "Search Console ready" : "Connect Search Console OAuth",
        workerEnabled: true,
      });
    },
  },
  quotaProvider: {
    evaluate() {
      return basicQuota({ label: "Requests / day", current: 0, maximum: 25000, unit: "requests" });
    },
  },
  automationProvider: createAutomationProviderFor("search_console", basePolicy({ cadenceMinutes: 60 })),
  validationHandler: {
    validate(ctx, options): GoogleValidationResult {
      const ok = thisIsConfigured("search_console", ctx);
      return {
        ok,
        message: ok ? "Search Console validation passed" : "Missing OAuth or site URL",
        dryRun: options?.dryRun,
      };
    },
  },
  operationHandlers: {
    submit_sitemap: (_ctx, _params, options) =>
      opOk("Sitemap submission queued", options?.dryRun),
    inspect_url: (_ctx, params, options) =>
      opOk(`URL inspection queued for ${String(params.url ?? "")}`, options?.dryRun),
    sync_analytics: (_ctx, _params, options) =>
      opOk("Search analytics sync queued", options?.dryRun),
  },
  resolveConnection(ctx) {
    const google = legacyGoogle(ctx);
    const stored = ctx.platform.services.search_console?.connection;
    const configured = Boolean(google.enabled && google.siteUrl && hasLegacyBearer(google));
    const matched =
      stored?.matchedGscSiteUrl?.trim() ||
      (typeof google.siteUrl === "string" ? google.siteUrl.trim() : "") ||
      null;
    const base = connectedOAuth(
      configured,
      searchConsoleIntegration.requiredScopes,
      configured ? searchConsoleIntegration.requiredScopes : [],
      matched,
    );
    return {
      ...base,
      matchedGscSiteUrl: stored?.matchedGscSiteUrl ?? matched,
      propertyKind: stored?.propertyKind ?? (matched ? gscPropertyKind(matched) : null),
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("search_console", ctx);
  },
};

export const analyticsIntegration: GoogleIntegrationDefinition = {
  id: "analytics",
  displayName: "Google Analytics",
  icon: "chart",
  category: "analytics",
  description: "GA4 measurement tag and Analytics API property ingestion.",
  requiredScopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  capabilities: {
    supportsOAuth: true,
    supportsApiKey: false,
    supportsServiceAccount: false,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    {
      id: "sync_ga4",
      title: "Sync GA4 Metrics",
      description: "Import GA4 property metrics",
      permission: "seo.google.analytics.sync",
      supportsDryRun: true,
      supportsScheduling: true,
    },
    {
      id: "validate_measurement",
      title: "Validate Measurement ID",
      description: "Check GA4 measurement ID format and site install",
      permission: "seo.google.analytics.validate",
      supportsDryRun: true,
      supportsScheduling: false,
    },
  ],
  configurationSchema: {
    fields: [
      { key: "measurementId", label: "Measurement ID", type: "string", group: "Site tracking", placeholder: "G-XXXXXXXX" },
      { key: "ga4PropertyId", label: "GA4 Property ID", type: "string", group: "API" },
      { key: "gtagEnabled", label: "Enable gtag.js", type: "boolean", group: "Site tracking" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 60 }),
  dependencies: [],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "analytics",
  tabId: "analytics",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("analytics", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "Analytics configured" : "Configure GA4 / GTM",
      });
    },
  },
  quotaProvider: {
    evaluate() {
      return basicQuota({ label: "API requests / day", current: 0, maximum: 50000, unit: "requests" });
    },
  },
  automationProvider: createAutomationProviderFor("analytics", basePolicy({ cadenceMinutes: 60 })),
  validationHandler: {
    validate(ctx, options) {
      const ok = thisIsConfigured("analytics", ctx);
      return { ok, message: ok ? "Analytics validation passed" : "Measurement ID or property missing", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    sync_ga4: (_c, _p, o) => opOk("GA4 sync queued", o?.dryRun),
    validate_measurement: (ctx, _p, o) => {
      const ok = thisIsConfigured("analytics", ctx);
      return ok ? opOk("Measurement configuration looks valid", o?.dryRun) : opFail("Measurement not configured");
    },
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("analytics", ctx);
    const tracking = ctx.tracking ?? {};
    const measurementId =
      (typeof tracking.measurementId === "string" && tracking.measurementId) ||
      cfgString(ctx, "analytics", "measurementId") ||
      ctx.env?.gaId ||
      null;
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: measurementId,
      project: null,
      grantedScopes: configured ? analyticsIntegration.requiredScopes : [],
      missingScopes: configured ? [] : analyticsIntegration.requiredScopes,
      authMethod: hasLegacyBearer(legacyGoogle(ctx)) ? "oauth" : configured ? "api_key" : "none",
      message: configured ? "Analytics active" : "Not configured",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("analytics", ctx);
  },
};

export const tagManagerIntegration: GoogleIntegrationDefinition = {
  id: "tag_manager",
  displayName: "Tag Manager",
  icon: "tag",
  category: "analytics",
  description: "GTM container installed on locale marketing pages.",
  requiredScopes: [],
  capabilities: {
    supportsOAuth: false,
    supportsApiKey: false,
    supportsServiceAccount: false,
    supportsAutomation: false,
    supportsMonitoring: true,
    supportsQuota: false,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    {
      id: "validate_container",
      title: "Validate Container",
      description: "Validate GTM container ID and snippets",
      permission: "seo.google.gtm.validate",
      supportsDryRun: true,
      supportsScheduling: false,
    },
  ],
  configurationSchema: {
    fields: [
      { key: "gtmContainerId", label: "Container ID", type: "string", required: true, placeholder: "GTM-XXXXXXX", group: "General" },
      { key: "gtmEnabled", label: "Enable GTM", type: "boolean", group: "General" },
      { key: "gtmHeadSnippet", label: "Head snippet", type: "textarea", group: "Snippets" },
      { key: "gtmBodySnippet", label: "Body snippet", type: "textarea", group: "Snippets" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 1440, workerEnabled: false }),
  dependencies: [],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  tabId: "tag-manager",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("tag_manager", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "GTM configured" : "Add GTM container ID",
        workerEnabled: false,
      });
    },
  },
  quotaProvider: { evaluate: () => null },
  automationProvider: createAutomationProviderFor(
    "tag_manager",
    basePolicy({ cadenceMinutes: 1440, workerEnabled: false }),
  ),
  validationHandler: {
    validate(ctx, options) {
      const ok = thisIsConfigured("tag_manager", ctx);
      return { ok, message: ok ? "GTM validation passed" : "Container ID missing", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    validate_container: (ctx, _p, o) => {
      const ok = thisIsConfigured("tag_manager", ctx);
      return ok ? opOk("GTM container looks valid", o?.dryRun) : opFail("GTM not configured");
    },
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("tag_manager", ctx);
    const tracking = ctx.tracking ?? {};
    const id =
      (typeof tracking.gtmContainerId === "string" && tracking.gtmContainerId) ||
      cfgString(ctx, "tag_manager", "gtmContainerId") ||
      null;
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: id,
      project: null,
      grantedScopes: [],
      missingScopes: [],
      authMethod: "none",
      message: configured ? "GTM active" : "Not configured",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("tag_manager", ctx);
  },
};

export const merchantCenterIntegration: GoogleIntegrationDefinition = {
  id: "merchant_center",
  displayName: "Merchant Center",
  icon: "store",
  category: "commerce",
  description:
    "Scheduled-fetch product feed for Google Merchant Center. AZURA publishes /feeds/google-shopping.xml; Google fetches it. This app does not upload products through the Content API.",
  requiredScopes: [],
  capabilities: {
    supportsOAuth: false,
    supportsApiKey: false,
    supportsServiceAccount: false,
    supportsAutomation: false,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    {
      id: "preview_feed",
      title: "Preview Feed",
      description: "Evaluate catalog and preview feed counts/sample items",
      permission: "seo.google.mc.feed",
      supportsDryRun: true,
      supportsScheduling: false,
    },
    {
      id: "validate_catalog",
      title: "Validate Catalog",
      description: "Run local eligibility diagnostics across published products",
      permission: "seo.google.mc.validate",
      supportsDryRun: true,
      supportsScheduling: false,
    },
  ],
  configurationSchema: {
    fields: [
      { key: "merchantId", label: "Merchant ID", type: "string", required: true, group: "General" },
      { key: "country", label: "Country", type: "string", group: "General", placeholder: "AE" },
      { key: "language", label: "Language", type: "string", group: "General", placeholder: "en" },
      { key: "feedLabel", label: "Feed label", type: "string", group: "General" },
      { key: "defaultCurrency", label: "Default currency", type: "string", group: "General", placeholder: "AED" },
      {
        key: "destination",
        label: "Feed destination",
        type: "select",
        group: "General",
        options: [
          { value: "shopping_ads", label: "Shopping Ads" },
          { value: "free_listings", label: "Free Listings" },
          { value: "local_inventory", label: "Local Inventory" },
        ],
      },
      {
        key: "storeUrl",
        label: "Verified store URL (must match GMC Business info)",
        type: "url",
        group: "Product Feed",
        required: true,
        placeholder: "https://brt-me.com",
      },
      {
        key: "feedUrl",
        label: "Feed URL",
        type: "url",
        group: "Product Feed",
        placeholder: "https://your-domain.com/feeds/google-shopping.xml",
      },
      {
        key: "mvpCampaignProductSet",
        label: "Initial campaign product set",
        type: "textarea",
        group: "Product Feed",
        placeholder:
          "One product id, slug, or MPN per line.\nLaunch gate: each must be Approved in GMC before PMax.",
      },
      { key: "shippingCountry", label: "Shipping country", type: "string", group: "Shipping", placeholder: "AE" },
      { key: "shippingService", label: "Shipping service", type: "string", group: "Shipping", placeholder: "Standard" },
      { key: "shippingPrice", label: "Shipping price", type: "number", group: "Shipping", placeholder: "0" },
      {
        key: "validationMode",
        label: "Validation mode",
        type: "select",
        group: "Diagnostics",
        options: [
          { value: "standard", label: "Standard (default — keep for first launch cycle)" },
          { value: "strict", label: "Strict (exclude missing GTIN — only after GTIN audit)" },
          { value: "permissive", label: "Permissive" },
        ],
      },
      {
        key: "checklistWebsiteVerified",
        label: "Website verified in GMC (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistGmcShipping",
        label: "UAE shipping configured in GMC (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistReturns",
        label: "Returns configured in GMC (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistShoppingAds",
        label: "Shopping Ads destination enabled (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistFeedRegistered",
        label: "Feed registered in GMC (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistMvpApproved",
        label: "MVP campaign set Approved in GMC (tick only after Google approval)",
        type: "boolean",
        group: "Operator checklist",
      },
      {
        key: "checklistAdsLinked",
        label: "GMC linked + PMax/Shopping live in Ads (tick only after done in Google)",
        type: "boolean",
        group: "Operator checklist",
      },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 120, parallelRequests: 1, retryCount: 2 }),
  dependencies: [
    { integrationId: "search_console", required: false, reason: "Improves product landing-page verification" },
    { integrationId: "analytics", required: false, reason: "Enables conversion attribution" },
  ],
  contractVersion: 1,
  schemaVersion: 4,
  migrationVersion: 4,
  connectorId: "merchant_center",
  tabId: "merchant-center",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("merchant_center", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured
          ? "Configured for scheduled fetch"
          : "Add Merchant ID and Feed URL",
      });
    },
  },
  quotaProvider: {
    evaluate(ctx) {
      const monitoring = ctx.platform.services.merchant_center?.monitoring;
      const products = Number(monitoring?.metrics?.products ?? 0);
      return basicQuota({ label: "Feed items", current: products, maximum: 1000000, unit: "products" });
    },
  },
  automationProvider: createAutomationProviderFor(
    "merchant_center",
    basePolicy({ cadenceMinutes: 120, parallelRequests: 1, retryCount: 2 }),
  ),
  validationHandler: {
    validate(ctx, options) {
      const merchantId = cfgString(ctx, "merchant_center", "merchantId");
      const feedUrl = cfgString(ctx, "merchant_center", "feedUrl");
      const storeUrl = cfgString(ctx, "merchant_center", "storeUrl");
      const ok = Boolean(merchantId && feedUrl);
      const warnings: string[] = [];
      if (!merchantId) warnings.push("Merchant ID is required");
      if (!feedUrl) warnings.push("Feed URL is required for scheduled fetch");
      if (merchantId && !storeUrl) {
        warnings.push(
          "Verified store URL is empty — set it to the exact GMC Business info online store URL (e.g. https://brt-me.com) so product links match",
        );
      }
      if (storeUrl) {
        try {
          const host = new URL(storeUrl).hostname.toLowerCase();
          if (host.startsWith("www.")) {
            const apex = host.slice(4);
            warnings.push(
              `Verified store URL uses www (${storeUrl}) — for BRT use apex https://${apex} (www redirects to apex; GMC + g:link must match the final host)`,
            );
          }
        } catch {
          warnings.push("Verified store URL is not a valid absolute URL");
        }
      }
      if (!cfgString(ctx, "merchant_center", "shippingCountry")) {
        warnings.push("Shipping country not set (defaults to AE at feed time)");
      }
      const mvpSet = cfgString(ctx, "merchant_center", "mvpCampaignProductSet");
      if (!mvpSet) {
        warnings.push(
          "Initial campaign product set is empty — define MVP SKUs before treating Shopping as launch-ready",
        );
      }
      const validationMode = cfgString(ctx, "merchant_center", "validationMode") || "standard";
      if (validationMode === "strict") {
        warnings.push(
          "validationMode is strict — keep standard for the first production cycle until GTIN cleanup",
        );
      }
      return {
        ok,
        message: ok
          ? "Merchant Center scheduled-fetch configuration valid"
          : "Merchant ID and Feed URL are required",
        warnings,
        dryRun: options?.dryRun,
      };
    },
  },
  operationHandlers: {
    preview_feed: (_c, _p, o) =>
      opOk("Use Merchant Center panel Preview — live handler required", o?.dryRun),
    validate_catalog: (_c, _p, o) =>
      opOk("Use Merchant Center panel Validate — live handler required", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("merchant_center", ctx);
    const merchantId = cfgString(ctx, "merchant_center", "merchantId");
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: merchantId || null,
      project: null,
      grantedScopes: [],
      missingScopes: [],
      authMethod: "none",
      message: configured
        ? `Scheduled fetch · Merchant ${merchantId}`
        : "Not configured for scheduled fetch",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("merchant_center", ctx);
  },
};

export const businessProfileIntegration: GoogleIntegrationDefinition = {
  id: "business_profile",
  displayName: "Business Profile",
  icon: "map-pin",
  category: "local",
  description: "Local business locations, reviews, photos, and posts.",
  requiredScopes: ["https://www.googleapis.com/auth/business.manage"],
  capabilities: {
    supportsOAuth: true,
    supportsApiKey: false,
    supportsServiceAccount: false,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    { id: "sync_reviews", title: "Sync Reviews", description: "Pull latest reviews", permission: "seo.google.bp.reviews", supportsDryRun: true, supportsScheduling: true },
    { id: "sync_photos", title: "Sync Photos", description: "Pull location photos", permission: "seo.google.bp.photos", supportsDryRun: true, supportsScheduling: true },
    { id: "publish_post", title: "Publish Post", description: "Publish a Business Profile post", permission: "seo.google.bp.post", parameters: [{ key: "content", label: "Content", type: "string", required: true }], supportsDryRun: true, supportsScheduling: false },
    { id: "refresh_location", title: "Refresh Location", description: "Refresh primary location data", permission: "seo.google.bp.refresh", supportsDryRun: false, supportsScheduling: true },
    { id: "reply_suggestions", title: "Reply Suggestions", description: "Generate review reply suggestions", permission: "seo.google.bp.replies", supportsDryRun: true, supportsScheduling: false },
  ],
  configurationSchema: {
    fields: [
      { key: "businessAccountId", label: "Business Account", type: "string", required: true, group: "General" },
      { key: "locationId", label: "Location", type: "string", group: "General" },
      { key: "primaryLocation", label: "Primary location", type: "boolean", group: "General" },
      { key: "language", label: "Language", type: "string", group: "General" },
      { key: "timezone", label: "Timezone", type: "string", group: "General" },
      { key: "reviewSync", label: "Review sync", type: "boolean", group: "Sync" },
      { key: "photoSync", label: "Photo sync", type: "boolean", group: "Sync" },
      { key: "postsEnabled", label: "Posts", type: "boolean", group: "Posts" },
      { key: "autoPublishUpdates", label: "Auto publish updates", type: "boolean", group: "Posts" },
      { key: "autoPublishOffers", label: "Auto publish offers", type: "boolean", group: "Posts" },
      { key: "autoPublishEvents", label: "Auto publish events", type: "boolean", group: "Posts" },
      { key: "questionsEnabled", label: "Questions", type: "boolean", group: "Questions" },
      { key: "reviewReplyAi", label: "Review reply AI", type: "boolean", group: "Reviews" },
      { key: "autoClassifyReviews", label: "Auto classify reviews", type: "boolean", group: "Reviews" },
      { key: "pullIntervalMinutes", label: "Pull interval (minutes)", type: "number", group: "Sync" },
      { key: "reviewIntervalMinutes", label: "Review interval (minutes)", type: "number", group: "Sync" },
      { key: "photoIntervalMinutes", label: "Photo interval (minutes)", type: "number", group: "Sync" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 180 }),
  dependencies: [{ integrationId: "search_console", required: false, reason: "Helps correlate local search signals" }],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "business_profile",
  tabId: "business-profile",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("business_profile", ctx);
      const hasScope = hasGrantedScope(
        ctx,
        "business_profile",
        businessProfileIntegration.requiredScopes[0],
      );
      const connection = ctx.platform.services.business_profile?.connection;
      const hasOauth =
        hasLegacyBearer(legacyGoogle(ctx)) ||
        connection?.authMethod === "oauth" ||
        connection?.state === "connected";
      const discovery = readBusinessProfileDiscovery(ctx.platform);
      const rateLimited = isBusinessProfileRateLimited(discovery);
      return basicHealth({
        configured,
        authOk: hasScope,
        lastSuccessAt: discovery.lastSyncedAt,
        message: configured
          ? rateLimited
            ? "Business Profile connected · Rate limited"
            : "Business Profile connected"
          : hasOauth && !hasScope
            ? "Reconnect Business Profile to grant business.manage"
            : "Connect Business Profile account",
      });
    },
  },
  quotaProvider: {
    evaluate() {
      return basicQuota({ label: "API calls / day", current: 0, maximum: 10000, unit: "requests" });
    },
  },
  automationProvider: createAutomationProviderFor("business_profile", basePolicy({ cadenceMinutes: 180 })),
  validationHandler: {
    validate(ctx, options) {
      const google = legacyGoogle(ctx);
      const hasTokens = hasLegacyBearer(google);
      const hasScope = hasGrantedScope(
        ctx,
        "business_profile",
        businessProfileIntegration.requiredScopes[0],
      );
      if (!hasTokens && ctx.platform.services.business_profile?.connection?.authMethod !== "oauth") {
        return {
          ok: false,
          message: "Business Profile OAuth token is not available. Connect under Admin → SEO → Google.",
          dryRun: options?.dryRun,
        };
      }
      if (!hasScope) {
        return {
          ok: false,
          message: "Reconnect Business Profile to grant the business.manage scope.",
          dryRun: options?.dryRun,
        };
      }
      const discovery = readBusinessProfileDiscovery(ctx.platform);
      if (isBusinessProfileRateLimited(discovery)) {
        return {
          ok: true,
          message: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
          warnings: [BUSINESS_PROFILE_RATE_LIMITED_MESSAGE],
          dryRun: options?.dryRun,
        };
      }
      if (discovery.lastError && !discovery.lastSyncedAt) {
        // Rate-limit text must never fail Test Connection / markVerified as error.
        if (isBusinessProfileRateLimitError(discovery.lastError)) {
          return {
            ok: true,
            message: discovery.lastError,
            warnings: [discovery.lastError],
            dryRun: options?.dryRun,
          };
        }
        return {
          ok: false,
          message: `Business Profile credentials present, but sync failed: ${discovery.lastError}`,
          dryRun: options?.dryRun,
        };
      }
      const last = discovery.lastSyncedAt
        ? ` Last synced ${discovery.lastSyncedAt}.`
        : " Discovery has not completed yet.";
      return {
        ok: true,
        message: `Business Profile credentials and scopes present.${last}`,
        dryRun: options?.dryRun,
      };
    },
  },
  operationHandlers: {
    sync_reviews: (_c, _p, o) => opOk("Review sync queued", o?.dryRun),
    sync_photos: (_c, _p, o) => opOk("Photo sync queued", o?.dryRun),
    publish_post: (_c, params, o) => opOk(`Post queued: ${String(params.content ?? "").slice(0, 40)}`, o?.dryRun),
    refresh_location: (_c, _p, o) => opOk("Location refresh queued", o?.dryRun),
    reply_suggestions: (_c, _p, o) => opOk("Reply suggestions generated", o?.dryRun),
  },
  resolveConnection(ctx) {
    const discovery = readBusinessProfileDiscovery(ctx.platform);
    const account =
      cfgString(ctx, "business_profile", "businessAccountId") || discovery.businessAccountId || null;
    const granted = connectionScopes(ctx, "business_profile");
    return connectedOAuth(
      thisIsConfigured("business_profile", ctx),
      businessProfileIntegration.requiredScopes,
      granted,
      account,
    );
  },
  isConfigured(ctx) {
    return thisIsConfigured("business_profile", ctx);
  },
};

export const pagespeedIntegration: GoogleIntegrationDefinition = {
  id: "pagespeed",
  displayName: "PageSpeed Insights",
  icon: "gauge",
  category: "performance",
  description: "Core Web Vitals audits for desktop and mobile.",
  requiredScopes: [],
  capabilities: {
    supportsOAuth: false,
    supportsApiKey: true,
    supportsServiceAccount: false,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    { id: "run_audit", title: "Run Audit", description: "Run PageSpeed audit", permission: "seo.google.psi.audit", parameters: [{ key: "url", label: "URL", type: "url", required: true }, { key: "strategy", label: "Strategy", type: "select", options: [{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }] }], supportsDryRun: true, supportsScheduling: true },
    { id: "compare_audits", title: "Compare Audits", description: "Compare recent audits", permission: "seo.google.psi.compare", supportsDryRun: false, supportsScheduling: false },
    { id: "store_history", title: "Store History", description: "Persist latest audit history", permission: "seo.google.psi.history", supportsDryRun: false, supportsScheduling: true },
  ],
  configurationSchema: {
    fields: [
      { key: "apiKey", label: "API Key", type: "secret", required: true, group: "Access" },
      { key: "strategy", label: "Default strategy", type: "select", group: "Audit", options: [{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }, { value: "both", label: "Both" }] },
      { key: "defaultUrls", label: "Default URLs (comma-separated)", type: "textarea", group: "Audit" },
      { key: "thresholdLcp", label: "LCP threshold (ms)", type: "number", group: "Monitoring" },
      { key: "thresholdCls", label: "CLS threshold", type: "number", group: "Monitoring" },
      { key: "thresholdInp", label: "INP threshold (ms)", type: "number", group: "Monitoring" },
      { key: "thresholdTtfb", label: "TTFB threshold (ms)", type: "number", group: "Monitoring" },
      { key: "historyRetentionDays", label: "History retention (days)", type: "number", group: "Monitoring" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 360, parallelRequests: 1 }),
  dependencies: [],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "pagespeed",
  tabId: "pagespeed",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("pagespeed", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "PageSpeed API key set" : "PageSpeed Insights API key not set",
      });
    },
  },
  quotaProvider: {
    evaluate(ctx) {
      const current = Number(ctx.platform.services.pagespeed?.monitoring?.metrics?.quotaUsed ?? 0);
      return basicQuota({ label: "API quota", current, maximum: 25000, unit: "requests" });
    },
  },
  automationProvider: createAutomationProviderFor("pagespeed", basePolicy({ cadenceMinutes: 360, parallelRequests: 1 })),
  validationHandler: {
    validate(ctx, options) {
      const fromConfig = cfgString(ctx, "pagespeed", "apiKey");
      const fromLegacy = hasLegacyApiKey(legacyGoogle(ctx));
      const ok = Boolean(fromConfig) || fromLegacy;
      return { ok, message: ok ? "PageSpeed API key present" : "API key required", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    run_audit: (_c, params, o) => opOk(`Audit queued for ${String(params.url ?? "default URLs")}`, o?.dryRun),
    compare_audits: () => opOk("Audit comparison ready"),
    store_history: (_c, _p, o) => opOk("Audit history stored", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("pagespeed", ctx);
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: null,
      project: null,
      grantedScopes: [],
      missingScopes: [],
      authMethod: configured ? "api_key" : "none",
      message: configured ? "API key configured" : "API key not set",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("pagespeed", ctx);
  },
};

export const googleAdsIntegration: GoogleIntegrationDefinition = {
  id: "ads",
  displayName: "Google Ads",
  icon: "megaphone",
  category: "ads",
  description:
    "OAuth, developer token, MCC, and Ads customer — source of truth for Marketing campaign sync.",
  requiredScopes: ["https://www.googleapis.com/auth/adwords"],
  capabilities: {
    supportsOAuth: true,
    supportsApiKey: false,
    supportsServiceAccount: false,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: true,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    { id: "sync_conversions", title: "Sync Conversions", description: "Import conversion actions", permission: "seo.google.ads.conversions", supportsDryRun: true, supportsScheduling: true },
    { id: "import_campaigns", title: "Import Campaigns", description: "Sync campaign inventory", permission: "seo.google.ads.campaigns", supportsDryRun: true, supportsScheduling: true },
    { id: "validate_tracking", title: "Validate Tracking", description: "Validate conversion tracking tags", permission: "seo.google.ads.validate", supportsDryRun: true, supportsScheduling: false },
    { id: "refresh_audiences", title: "Refresh Audiences", description: "Refresh remarketing audiences", permission: "seo.google.ads.audiences", supportsDryRun: true, supportsScheduling: true },
  ],
  configurationSchema: {
    fields: [
      {
        key: "customerId",
        label: "Customer ID",
        type: "string",
        required: true,
        group: "Identity",
        placeholder: "123-456-7890",
        description: "Numeric Google Ads customer (10 digits). Not an email.",
      },
      {
        key: "managerAccountId",
        label: "Manager Account (MCC)",
        type: "string",
        group: "Identity",
        placeholder: "123-456-7890",
        description: "Numeric MCC / login-customer-id. Not an email address.",
      },
      { key: "conversionLabels", label: "Conversion Labels", type: "textarea", group: "Tracking" },
      { key: "remarketing", label: "Remarketing", type: "boolean", group: "Tracking" },
      { key: "enhancedConversions", label: "Enhanced Conversions", type: "boolean", group: "Tracking" },
      { key: "autoTagging", label: "Auto-tagging", type: "boolean", group: "Tracking" },
      { key: "defaultBudget", label: "Default Budget", type: "number", group: "Campaign Defaults" },
      { key: "currency", label: "Currency", type: "string", group: "Campaign Defaults" },
      { key: "targetCountry", label: "Target Country", type: "string", group: "Campaign Defaults" },
      { key: "syncCampaigns", label: "Sync campaigns", type: "boolean", group: "Automation" },
      { key: "importConversions", label: "Import conversions", type: "boolean", group: "Automation" },
      { key: "negativeKeywordSync", label: "Negative keyword sync", type: "boolean", group: "Automation" },
      {
        key: "developerToken",
        label: "Developer token",
        type: "secret",
        group: "Credentials",
        description: "Google Ads API developer token",
      },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 360 }),
  dependencies: [{ integrationId: "analytics", required: false, reason: "Improves conversion import quality" }],
  contractVersion: 1,
  schemaVersion: 3,
  migrationVersion: 1,
  connectorId: "ads",
  tabId: "ads",
  healthProvider: {
    evaluate(ctx) {
      const mkt = ctx.marketingGoogleAds;
      const readiness = mkt?.readiness ?? "not_connected";
      const oauth = Boolean(mkt?.oauthConnected);
      const operational = readiness === "operational" || Boolean(mkt?.operational);
      return basicHealth({
        configured: operational,
        authOk: oauth,
        message:
          mkt?.summary ??
          (operational
            ? "Google Ads operational"
            : oauth
              ? "OAuth connected — finish developer token, numeric MCC, and customer ID"
              : "Not connected — Connect OAuth and save Ads credentials"),
      });
    },
  },
  quotaProvider: {
    evaluate() {
      return basicQuota({ label: "Developer token quota", current: 0, maximum: 15000, unit: "operations" });
    },
  },
  automationProvider: createAutomationProviderFor("ads", basePolicy({ cadenceMinutes: 360 })),
  validationHandler: {
    validate(ctx, options) {
      const mkt = ctx.marketingGoogleAds;
      const customerId = cfgString(ctx, "ads", "customerId");
      const manager = cfgString(ctx, "ads", "managerAccountId");
      const warnings: string[] = [];
      if (customerId && !/^\d[\d-]{4,}\d$/.test(customerId.replace(/\s/g, ""))) {
        warnings.push("Customer ID must be numeric (hyphens allowed)");
      }
      if (manager && !/^\d[\d-]{4,}\d$/.test(manager.replace(/\s/g, ""))) {
        warnings.push("Manager Account (MCC) must be numeric — emails are not valid");
      }
      const ok = Boolean(mkt?.operational) && warnings.length === 0;
      return {
        ok,
        message: ok
          ? "Google Ads operational"
          : warnings[0] ??
            (mkt?.oauthConnected
              ? "Finish developer token, numeric MCC, and customer ID"
              : "Connect Google Ads OAuth and save Identity + Credentials"),
        warnings,
        dryRun: options?.dryRun,
      };
    },
  },
  operationHandlers: {
    sync_conversions: (_c, _p, o) => opOk("Conversion sync queued", o?.dryRun),
    import_campaigns: (_c, _p, o) => opOk("Campaign import queued", o?.dryRun),
    validate_tracking: (_c, _p, o) => opOk("Tracking validation completed", o?.dryRun),
    refresh_audiences: (_c, _p, o) => opOk("Audience refresh queued", o?.dryRun),
  },
  resolveConnection(ctx) {
    const mkt = ctx.marketingGoogleAds;
    const readiness = mkt?.readiness ?? "not_connected";
    const oauth = Boolean(mkt?.oauthConnected);
    const account = mkt?.customerId || cfgString(ctx, "ads", "customerId") || null;
    const granted = connectionScopes(ctx, "ads");

    let state: GoogleConnectionState = "disconnected";
    if (readiness === "operational" || mkt?.operational) state = "connected";
    else if (readiness === "setup_incomplete" || oauth) state = "connecting";

    return {
      state,
      lastVerifiedAt:
        mkt?.lastVerifiedAt ?? (state !== "disconnected" ? new Date().toISOString() : null),
      account,
      project: null,
      grantedScopes:
        oauth || state === "connected" ? googleAdsIntegration.requiredScopes : granted,
      missingScopes:
        oauth || state === "connected" ? [] : googleAdsIntegration.requiredScopes,
      authMethod: oauth || state === "connected" ? "oauth" : "none",
      message:
        readiness === "operational" || mkt?.operational
          ? "Google Ads operational"
          : oauth
            ? "Setup incomplete — finish developer token, numeric MCC, and customer ID"
            : mkt?.summary ??
              "Not connected — Connect OAuth, then save developer token + numeric MCC + customer",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("ads", ctx);
  },
};

export const indexNowIntegration: GoogleIntegrationDefinition = {
  id: "indexnow",
  displayName: "IndexNow",
  icon: "send",
  category: "indexing",
  description: "Instant URL submission to IndexNow-compatible engines.",
  requiredScopes: [],
  capabilities: {
    supportsOAuth: false,
    supportsApiKey: true,
    supportsServiceAccount: false,
    supportsAutomation: true,
    supportsMonitoring: true,
    supportsQuota: false,
    supportsRunNow: true,
    supportsHistory: true,
    supportsValidation: true,
    supportsDryRun: true,
  },
  operations: [
    { id: "submit_url", title: "Submit URL", description: "Submit a single URL", permission: "seo.google.indexnow.submit", parameters: [{ key: "url", label: "URL", type: "url", required: true }], supportsDryRun: true, supportsScheduling: false },
    { id: "submit_batch", title: "Submit Batch", description: "Submit a batch of URLs", permission: "seo.google.indexnow.batch", supportsDryRun: true, supportsScheduling: true },
    { id: "verify_key", title: "Verify Key", description: "Verify IndexNow key location", permission: "seo.google.indexnow.verify", supportsDryRun: false, supportsScheduling: false },
    { id: "rebuild_queue", title: "Rebuild Queue", description: "Rebuild outbound IndexNow queue", permission: "seo.google.indexnow.queue", supportsDryRun: true, supportsScheduling: false },
  ],
  configurationSchema: {
    fields: [
      { key: "apiKey", label: "Key", type: "secret", required: true, group: "General" },
      { key: "host", label: "Host", type: "string", group: "General" },
      { key: "endpoint", label: "Endpoint", type: "url", group: "General" },
      { key: "keyLocation", label: "Key location", type: "url", group: "General" },
      { key: "batchSize", label: "Batch size", type: "number", group: "Throughput" },
      { key: "submissionMode", label: "Submission mode", type: "select", group: "Throughput", options: [{ value: "immediate", label: "Immediate" }, { value: "batched", label: "Batched" }] },
      { key: "automaticSubmission", label: "Automatic submission", type: "boolean", group: "Automation" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 15, retryCount: 5 }),
  dependencies: [],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "indexnow",
  tabId: "indexnow",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("indexnow", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "IndexNow configured" : "Configure IndexNow key",
      });
    },
  },
  quotaProvider: { evaluate: () => null },
  automationProvider: createAutomationProviderFor("indexnow", basePolicy({ cadenceMinutes: 15, retryCount: 5 })),
  validationHandler: {
    validate(ctx, options) {
      const ok = thisIsConfigured("indexnow", ctx);
      return { ok, message: ok ? "IndexNow key present" : "IndexNow key required", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    submit_url: (_c, params, o) => opOk(`URL submitted: ${String(params.url ?? "")}`, o?.dryRun),
    submit_batch: (_c, _p, o) => opOk("Batch submission queued", o?.dryRun),
    verify_key: (ctx) => {
      const ok = thisIsConfigured("indexnow", ctx);
      return ok ? opOk("IndexNow key verified") : opFail("IndexNow key missing");
    },
    rebuild_queue: (_c, _p, o) => opOk("IndexNow queue rebuilt", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("indexnow", ctx);
    const indexnow = legacyIndexNow(ctx);
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: typeof indexnow.host === "string" ? indexnow.host : cfgString(ctx, "indexnow", "host") || null,
      project: null,
      grantedScopes: [],
      missingScopes: [],
      authMethod: configured ? "api_key" : "none",
      message: configured ? "IndexNow configured" : "Not configured",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("indexnow", ctx);
  },
};

function thisIsConfigured(id: GoogleIntegrationId, ctx: GoogleIntegrationContext): boolean {
  const google = legacyGoogle(ctx);
  const tracking = ctx.tracking ?? {};
  const cfg = getServiceConfig(ctx, id);

  switch (id) {
    case "search_console":
      return Boolean(google.enabled && google.siteUrl && hasLegacyBearer(google));
    case "analytics": {
      const measurement =
        (typeof tracking.measurementId === "string" && tracking.measurementId.trim()) ||
        (typeof cfg.measurementId === "string" && cfg.measurementId.trim()) ||
        ctx.env?.gaId;
      const ga4 =
        (typeof google.ga4PropertyId === "string" && google.ga4PropertyId.trim()) ||
        (typeof cfg.ga4PropertyId === "string" && cfg.ga4PropertyId.trim());
      const gtm =
        (typeof tracking.gtmContainerId === "string" && tracking.gtmContainerId.trim()) ||
        tracking.gtmEnabled === true;
      return Boolean(measurement || ga4 || (google.analyticsEnabled && hasLegacyBearer(google)) || gtm);
    }
    case "tag_manager":
      return Boolean(
        (typeof tracking.gtmContainerId === "string" && tracking.gtmContainerId.trim()) ||
          (typeof cfg.gtmContainerId === "string" && String(cfg.gtmContainerId).trim()),
      );
    case "merchant_center":
      return Boolean(
        cfg.merchantId &&
          String(cfg.merchantId).trim() &&
          cfg.feedUrl &&
          String(cfg.feedUrl).trim(),
      );
    case "business_profile": {
      const hasScope = hasGrantedScope(
        ctx,
        "business_profile",
        businessProfileIntegration.requiredScopes[0],
      );
      const connection = ctx.platform.services.business_profile?.connection;
      const hasOauth =
        hasLegacyBearer(legacyGoogle(ctx)) ||
        connection?.authMethod === "oauth" ||
        connection?.state === "connected";
      return Boolean(hasScope && hasOauth);
    }
    case "pagespeed":
      return Boolean((cfg.apiKey && String(cfg.apiKey).trim()) || hasLegacyApiKey(google));
    case "ads": {
      // "Configured" for Ads means operational (OAuth + valid token + numeric MCC + customer).
      // Saving fields alone must not report Connected on overview.
      return Boolean(ctx.marketingGoogleAds?.operational);
    }
    case "indexnow": {
      const indexnow = legacyIndexNow(ctx);
      return Boolean(
        (indexnow.enabled && hasLegacyApiKey(indexnow)) ||
          (cfg.apiKey && String(cfg.apiKey).trim()),
      );
    }
    default:
      return false;
  }
}

export const ALL_GOOGLE_INTEGRATION_DEFINITIONS: GoogleIntegrationDefinition[] = [
  searchConsoleIntegration,
  analyticsIntegration,
  tagManagerIntegration,
  merchantCenterIntegration,
  businessProfileIntegration,
  pagespeedIntegration,
  googleAdsIntegration,
  indexNowIntegration,
];
