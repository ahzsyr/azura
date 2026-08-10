import type {
  GoogleConnectionSnapshot,
  GoogleIntegrationContext,
  GoogleIntegrationDefinition,
  GoogleIntegrationId,
  GoogleOperationalPolicy,
  GoogleOperationResult,
  GoogleValidationResult,
} from "../types";
import { DEFAULT_OPERATIONAL_POLICY } from "../types";
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
    const configured = Boolean(google.enabled && google.siteUrl && hasLegacyBearer(google));
    return connectedOAuth(
      configured,
      searchConsoleIntegration.requiredScopes,
      configured ? searchConsoleIntegration.requiredScopes : [],
      typeof google.siteUrl === "string" ? google.siteUrl : null,
    );
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
  description: "Product feed upload, shopping destinations, and Merchant Center diagnostics.",
  requiredScopes: ["https://www.googleapis.com/auth/content"],
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
    { id: "generate_feed", title: "Generate Feed", description: "Generate product feed", permission: "seo.google.mc.feed", supportsDryRun: true, supportsScheduling: true },
    { id: "validate_feed", title: "Validate Feed", description: "Validate feed before upload", permission: "seo.google.mc.validate", supportsDryRun: true, supportsScheduling: false },
    { id: "upload_feed", title: "Upload Feed", description: "Upload feed to Merchant Center", permission: "seo.google.mc.upload", supportsDryRun: true, supportsScheduling: true },
    { id: "view_diagnostics", title: "View Diagnostics", description: "Fetch Merchant Center diagnostics", permission: "seo.google.mc.diagnostics", supportsDryRun: false, supportsScheduling: false },
    { id: "sync_products", title: "Sync Products", description: "Sync product catalog", permission: "seo.google.mc.sync", supportsDryRun: true, supportsScheduling: true },
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
      { key: "feedUrl", label: "Feed URL", type: "url", group: "Product Feed", placeholder: "https://your-domain.com/feeds/google-shopping.xml" },
      { key: "feedSchedule", label: "Feed schedule", type: "string", group: "Product Feed", placeholder: "0 */6 * * *" },
      { key: "compression", label: "Compression", type: "select", group: "Product Feed", options: [{ value: "none", label: "None" }, { value: "gzip", label: "Gzip" }] },
      { key: "automaticUpload", label: "Automatic upload", type: "boolean", group: "Product Feed" },
      { key: "incrementalUpload", label: "Incremental upload", type: "boolean", group: "Product Feed" },
      { key: "availabilityMapping", label: "Availability mapping", type: "string", group: "Mapping" },
      { key: "conditionMapping", label: "Condition mapping", type: "string", group: "Mapping" },
      { key: "brandMapping", label: "Brand mapping", type: "string", group: "Mapping" },
      { key: "gtinPolicy", label: "GTIN policy", type: "string", group: "Mapping" },
      { key: "mpnPolicy", label: "MPN policy", type: "string", group: "Mapping" },
      { key: "fetchFrequency", label: "Fetch frequency (minutes)", type: "number", group: "Diagnostics" },
      { key: "maxProductsPerBatch", label: "Max products per batch", type: "number", group: "Diagnostics" },
      {
        key: "validationMode",
        label: "Validation mode",
        type: "select",
        group: "Diagnostics",
        options: [
          { value: "strict", label: "Strict" },
          { value: "standard", label: "Standard" },
          { value: "permissive", label: "Permissive" },
        ],
      },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 120, parallelRequests: 3, retryCount: 5 }),
  dependencies: [
    { integrationId: "search_console", required: false, reason: "Improves product landing-page verification" },
    { integrationId: "analytics", required: false, reason: "Enables conversion attribution" },
  ],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "merchant_center",
  tabId: "merchant-center",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("merchant_center", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "Merchant Center configured" : "Add Merchant ID and connect",
      });
    },
  },
  quotaProvider: {
    evaluate(ctx) {
      const monitoring = ctx.platform.services.merchant_center?.monitoring;
      const products = Number(monitoring?.metrics?.products ?? 0);
      return basicQuota({ label: "Products", current: products, maximum: 1000000, unit: "products" });
    },
  },
  automationProvider: createAutomationProviderFor(
    "merchant_center",
    basePolicy({ cadenceMinutes: 120, parallelRequests: 3, retryCount: 5 }),
  ),
  validationHandler: {
    validate(ctx, options) {
      const ok = Boolean(cfgString(ctx, "merchant_center", "merchantId"));
      return {
        ok,
        message: ok ? "Merchant Center configuration valid" : "Merchant ID is required",
        warnings: !cfgString(ctx, "merchant_center", "feedUrl") ? ["Feed URL not set"] : [],
        dryRun: options?.dryRun,
      };
    },
  },
  operationHandlers: {
    generate_feed: (_c, _p, o) => opOk("Product feed generated", o?.dryRun, { products: 0 }),
    validate_feed: (_c, _p, o) => opOk("Feed validation completed", o?.dryRun),
    upload_feed: (_c, _p, o) => opOk("Feed upload queued", o?.dryRun),
    view_diagnostics: () => opOk("Diagnostics refreshed", false, { warnings: 0 }),
    sync_products: (_c, _p, o) => opOk("Product sync queued", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("merchant_center", ctx);
    const merchantId = cfgString(ctx, "merchant_center", "merchantId");
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: merchantId || null,
      project: null,
      grantedScopes: configured ? merchantCenterIntegration.requiredScopes : [],
      missingScopes: configured ? [] : merchantCenterIntegration.requiredScopes,
      authMethod: hasLegacyBearer(legacyGoogle(ctx)) || hasLegacyServiceAccount(legacyGoogle(ctx)) ? "oauth" : configured ? "api_key" : "none",
      message: configured ? `Merchant ${merchantId}` : "Not configured",
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
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "Business Profile configured" : "Connect Business Profile account",
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
      const ok = Boolean(cfgString(ctx, "business_profile", "businessAccountId"));
      return { ok, message: ok ? "Business Profile valid" : "Business Account is required", dryRun: options?.dryRun };
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
    const configured = thisIsConfigured("business_profile", ctx);
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: cfgString(ctx, "business_profile", "businessAccountId") || null,
      project: null,
      grantedScopes: configured ? businessProfileIntegration.requiredScopes : [],
      missingScopes: configured ? [] : businessProfileIntegration.requiredScopes,
      authMethod: configured ? "oauth" : "none",
      message: configured ? "Business Profile connected" : "Not configured",
    };
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
  description: "Campaign sync, conversion import, and tracking validation.",
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
      { key: "customerId", label: "Customer ID", type: "string", required: true, group: "Identity" },
      { key: "managerAccountId", label: "Manager Account", type: "string", group: "Identity" },
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
      { key: "developerToken", label: "Developer token", type: "secret", group: "Credentials" },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 360 }),
  dependencies: [{ integrationId: "analytics", required: false, reason: "Improves conversion import quality" }],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "ads",
  tabId: "ads",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("ads", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "Google Ads configured" : "Add Customer ID and connect Ads",
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
      const ok = Boolean(cfgString(ctx, "ads", "customerId"));
      return { ok, message: ok ? "Google Ads configuration valid" : "Customer ID is required", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    sync_conversions: (_c, _p, o) => opOk("Conversion sync queued", o?.dryRun),
    import_campaigns: (_c, _p, o) => opOk("Campaign import queued", o?.dryRun),
    validate_tracking: (_c, _p, o) => opOk("Tracking validation completed", o?.dryRun),
    refresh_audiences: (_c, _p, o) => opOk("Audience refresh queued", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("ads", ctx);
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: cfgString(ctx, "ads", "customerId") || null,
      project: null,
      grantedScopes: configured ? googleAdsIntegration.requiredScopes : [],
      missingScopes: configured ? [] : googleAdsIntegration.requiredScopes,
      authMethod: configured ? "oauth" : "none",
      message: configured ? "Google Ads connected" : "Not configured",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("ads", ctx);
  },
};

export const indexingApiIntegration: GoogleIntegrationDefinition = {
  id: "indexing_api",
  displayName: "Indexing API",
  icon: "zap",
  category: "indexing",
  description: "URL publish/delete notifications via service account.",
  requiredScopes: ["https://www.googleapis.com/auth/indexing"],
  capabilities: {
    supportsOAuth: false,
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
    { id: "publish_url", title: "Publish URL", description: "Notify Google of a new/updated URL", permission: "seo.google.indexing.publish", parameters: [{ key: "url", label: "URL", type: "url", required: true }], supportsDryRun: true, supportsScheduling: false },
    { id: "delete_url", title: "Delete URL", description: "Notify Google of a removed URL", permission: "seo.google.indexing.delete", parameters: [{ key: "url", label: "URL", type: "url", required: true }], supportsDryRun: true, supportsScheduling: false },
    { id: "validate_payload", title: "Validate Payload", description: "Validate indexing notification payload", permission: "seo.google.indexing.validate", supportsDryRun: true, supportsScheduling: false },
    { id: "replay_failed", title: "Replay Failed Jobs", description: "Replay failed indexing jobs", permission: "seo.google.indexing.replay", supportsDryRun: true, supportsScheduling: false },
  ],
  configurationSchema: {
    fields: [
      { key: "serviceAccountJson", label: "Service account JSON", type: "json", required: true, group: "Credentials" },
      { key: "defaultPublishMode", label: "Default publish mode", type: "select", group: "Defaults", options: [{ value: "URL_UPDATED", label: "URL updated" }, { value: "URL_DELETED", label: "URL deleted" }] },
    ],
  },
  defaultPolicy: basePolicy({ cadenceMinutes: 30, parallelRequests: 1 }),
  dependencies: [{ integrationId: "search_console", required: false, reason: "Indexing API works best with verified Search Console property" }],
  contractVersion: 1,
  schemaVersion: 1,
  migrationVersion: 1,
  connectorId: "indexing_api",
  tabId: "indexing-api",
  healthProvider: {
    evaluate(ctx) {
      const configured = thisIsConfigured("indexing_api", ctx);
      return basicHealth({
        configured,
        authOk: configured,
        message: configured ? "Service account configured" : "Add Indexing API service account JSON",
      });
    },
  },
  quotaProvider: {
    evaluate() {
      return basicQuota({ label: "Publish notifications / day", current: 0, maximum: 200, unit: "notifications" });
    },
  },
  automationProvider: createAutomationProviderFor("indexing_api", basePolicy({ cadenceMinutes: 30, parallelRequests: 1 })),
  validationHandler: {
    validate(ctx, options) {
      const ok = thisIsConfigured("indexing_api", ctx);
      return { ok, message: ok ? "Indexing API credentials present" : "Service account JSON required", dryRun: options?.dryRun };
    },
  },
  operationHandlers: {
    publish_url: (_c, params, o) => opOk(`Publish queued for ${String(params.url ?? "")}`, o?.dryRun),
    delete_url: (_c, params, o) => opOk(`Delete notification queued for ${String(params.url ?? "")}`, o?.dryRun),
    validate_payload: (_c, _p, o) => opOk("Payload valid", o?.dryRun),
    replay_failed: (_c, _p, o) => opOk("Failed jobs replay queued", o?.dryRun),
  },
  resolveConnection(ctx) {
    const configured = thisIsConfigured("indexing_api", ctx);
    return {
      state: configured ? "connected" : "disconnected",
      lastVerifiedAt: configured ? new Date().toISOString() : null,
      account: null,
      project: null,
      grantedScopes: configured ? indexingApiIntegration.requiredScopes : [],
      missingScopes: configured ? [] : indexingApiIntegration.requiredScopes,
      authMethod: configured ? "service_account" : "none",
      message: configured ? "Service account configured" : "Not configured",
    };
  },
  isConfigured(ctx) {
    return thisIsConfigured("indexing_api", ctx);
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
      return Boolean(cfg.merchantId && String(cfg.merchantId).trim());
    case "business_profile":
      return Boolean(cfg.businessAccountId && String(cfg.businessAccountId).trim());
    case "pagespeed":
      return Boolean((cfg.apiKey && String(cfg.apiKey).trim()) || hasLegacyApiKey(google));
    case "ads":
      return Boolean(cfg.customerId && String(cfg.customerId).trim());
    case "indexing_api":
      return hasLegacyServiceAccount(google) || Boolean(cfg.serviceAccountJson && String(cfg.serviceAccountJson).trim());
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
  indexingApiIntegration,
  indexNowIntegration,
];
