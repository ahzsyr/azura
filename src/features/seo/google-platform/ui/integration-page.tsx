"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  googleSectionTabs,
  resolveGoogleSection,
} from "@/features/seo/admin/seo-google-tabs";
import type {
  GoogleConnectionSnapshot,
  GoogleHistoryEntry,
  GoogleIntegrationCapabilities,
  GoogleConfigurationSchema,
  GoogleIntegrationContext,
  GoogleMonitoringSnapshot,
  GoogleOperationalPolicy,
  GoogleOperationDefinition,
  GoogleServiceConfigMap,
  GoogleIntegrationId,
  GoogleDependency,
  BusinessProfileDiscoverySnapshot,
} from "../types";
import {
  disconnectGoogleIntegrationAction,
  runGoogleOperationAction,
  testGoogleIntegrationAction,
  upsertGoogleServiceConfigAction,
  upsertGoogleServicePolicyAction,
  type GooglePlatformActionResult,
} from "../actions";
import { BUSINESS_PROFILE_RATE_LIMITED_MESSAGE } from "@/features/seo/google-live/google-api-error";
import {
  isBusinessProfileRateLimitError,
  isBusinessProfileRateLimited,
} from "@/features/seo/google-live/business-profile-cache";

type SerializableDefinition = {
  id: GoogleIntegrationId;
  displayName: string;
  icon: string;
  category: string;
  description: string;
  requiredScopes: string[];
  capabilities: GoogleIntegrationCapabilities;
  operations: GoogleOperationDefinition[];
  configurationSchema: GoogleConfigurationSchema;
  defaultPolicy: GoogleOperationalPolicy;
  dependencies: GoogleDependency[];
  contractVersion: number;
  schemaVersion: number;
  migrationVersion: number;
  connectorId?: string;
  tabId: string;
};

export type GoogleIntegrationExtraSection = {
  id: string;
  label: string;
  content: ReactNode;
};

type IntegrationPageProps = {
  definition: SerializableDefinition;
  sections: string[];
  connection: GoogleConnectionSnapshot;
  configuration: GoogleServiceConfigMap;
  policy: GoogleOperationalPolicy;
  monitoring: GoogleMonitoringSnapshot;
  history: GoogleHistoryEntry[];
  dependencyMessage?: string;
  canStartOAuth?: boolean;
  marketingGoogleAds?: GoogleIntegrationContext["marketingGoogleAds"] | null;
  discovery?: BusinessProfileDiscoverySnapshot | null;
  /** Extra sub-tabs (legacy forms, Merchant Feed, etc.). */
  extraSections?: GoogleIntegrationExtraSection[];
  /** When true, extra sections appear before platform sections on the sub-ribbon. */
  extraSectionsFirst?: boolean;
};

function ActionStatus({ state }: { state: GooglePlatformActionResult | null }) {
  if (!state) return null;
  // Page banner + Cached discovery already show rate-limit guidance — do not reprint.
  if (isBusinessProfileRateLimitError(state.message)) return null;
  const data = state.data;
  const detail =
    data && typeof data.performanceScore === "number"
      ? ` · Perf ${data.performanceScore}${
          typeof data.lcpMs === "number" ? ` · LCP ${(Number(data.lcpMs) / 1000).toFixed(1)}s` : ""
        }${typeof data.dataSource === "string" ? ` · ${data.dataSource === "crux" ? "CrUX" : "lab"}` : ""}`
      : data && typeof data.urlCount === "number"
        ? ` · ${data.urlCount} URLs`
        : data && typeof data.indexed === "boolean"
          ? ` · ${data.indexed ? "Indexed" : "Not indexed"}`
          : "";
  return (
    <p
      className={`text-sm ${state.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}
      role="status"
    >
      {state.message}
      {detail}
    </p>
  );
}

function fieldValue(configuration: GoogleServiceConfigMap, key: string): string {
  const value = configuration[key];
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/** Locale dates differ between server and client; suppress the text hydration mismatch. */
function LocaleDate({ value }: { value: string | null | undefined }) {
  if (!value) return "—";
  return <span suppressHydrationWarning>{new Date(value).toLocaleString()}</span>;
}

export function GoogleIntegrationPage({
  definition,
  sections,
  connection,
  configuration,
  policy,
  monitoring,
  history,
  dependencyMessage,
  canStartOAuth,
  marketingGoogleAds,
  discovery = null,
  extraSections = [],
  extraSectionsFirst = false,
}: IntegrationPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [hashHint, setHashHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "configuration") setHashHint("configuration");
  }, []);

  const availableSections = useMemo(() => {
    const platform = sections.filter(Boolean);
    const extras = extraSections.map((s) => s.id);
    return extraSectionsFirst ? [...extras, ...platform] : [...platform, ...extras];
  }, [sections, extraSections, extraSectionsFirst]);

  const sectionTabs = useMemo(() => {
    const platformTabs = googleSectionTabs(sections);
    const extraTabs = extraSections.map((s) => ({ id: s.id, label: s.label }));
    return extraSectionsFirst ? [...extraTabs, ...platformTabs] : [...platformTabs, ...extraTabs];
  }, [sections, extraSections, extraSectionsFirst]);

  const activeSection = resolveGoogleSection(availableSections, sectionParam, hashHint);

  const handleSectionChange = (sectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.replace(`/admin/seo/google?${params.toString()}`, { scroll: false });
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setHashHint(null);
  };

  // Keep URL in sync when defaulting the first section (or honoring #configuration).
  useEffect(() => {
    if (!activeSection || sectionParam === activeSection) return;
    const params = new URLSearchParams(window.location.search);
    params.set("section", activeSection);
    // Preserve current tab from the address bar (may already be set).
    if (!params.get("tab") && definition.tabId) {
      params.set("tab", definition.tabId);
    }
    router.replace(`/admin/seo/google?${params.toString()}`, { scroll: false });
  }, [activeSection, sectionParam, definition.tabId, router]);

  const [configState, configAction, configPending] = useActionState(
    upsertGoogleServiceConfigAction,
    null,
  );
  const [policyState, policyAction, policyPending] = useActionState(
    upsertGoogleServicePolicyAction,
    null,
  );
  const [testState, testAction, testPending] = useActionState(testGoogleIntegrationAction, null);
  const [opState, opAction, opPending] = useActionState(runGoogleOperationAction, null);
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectGoogleIntegrationAction,
    null,
  );

  const groups = Array.from(
    new Set(definition.configurationSchema.fields.map((f) => f.group ?? "General")),
  );
  const isAds = definition.id === "ads";
  const isBusinessProfile = definition.id === "business_profile";
  const bpRateLimited = Boolean(isBusinessProfile && discovery && isBusinessProfileRateLimited(discovery));
  const adsReadiness = marketingGoogleAds?.readiness ?? "not_connected";
  const adsBadgeLabel =
    adsReadiness === "operational"
      ? "operational"
      : adsReadiness === "setup_incomplete"
        ? "setup incomplete"
        : "not connected";

  const extraActive = extraSections.find((s) => s.id === activeSection);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{definition.displayName}</h2>
        <p className="text-sm text-muted-foreground">{definition.description}</p>
        {isAds ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Configure OAuth, developer token, MCC, and Ads customer here. Marketing Ad Accounts and
            Campaigns consume this connection.{" "}
            <Link href="/admin/help#topic-seo-google" className="underline underline-offset-2">
              Setup help
            </Link>
          </p>
        ) : null}
        {dependencyMessage ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{dependencyMessage}</p>
        ) : null}
        {bpRateLimited && !(discovery?.rateLimitedUntil) ? (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100" role="status">
            {BUSINESS_PROFILE_RATE_LIMITED_MESSAGE}
          </p>
        ) : bpRateLimited ? (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100" role="status">
            Business Profile is temporarily rate-limited. Wait until the retry time below, then click Sync locations once. Do not reconnect.
          </p>
        ) : null}
      </div>

      {sectionTabs.length > 1 ? (
        <AdminSettingsRibbon
          tabs={sectionTabs}
          activeTab={activeSection}
          onTabChange={handleSectionChange}
          layoutId={`seo-google-section-${definition.id}`}
          variant="sub"
        />
      ) : null}

      {extraActive ? extraActive.content : null}

      {activeSection === "connection" ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Connection</CardTitle>
                <CardDescription>
                  {isAds
                    ? "SEO-owned OAuth, developer token, MCC, and Ads customer — Marketing consumes this connection."
                    : "Status, account, scopes, and connection actions."}
                </CardDescription>
              </div>
              <Badge
                className={
                  (isAds ? adsReadiness === "operational" : connection.state === "connected")
                    ? "bg-emerald-600 text-white border-transparent"
                    : isAds && adsReadiness === "setup_incomplete"
                      ? "bg-amber-600 text-white border-transparent"
                      : connection.state === "error"
                        ? "bg-destructive text-destructive-foreground border-transparent"
                        : ""
                }
                variant={
                  connection.state === "connected" ||
                  connection.state === "error" ||
                  (isAds && adsReadiness !== "not_connected")
                    ? undefined
                    : "outline"
                }
              >
                {isAds ? adsBadgeLabel : connection.state}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Last verified</span>
                <div>
                  <LocaleDate value={connection.lastVerifiedAt} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Account</span>
                <div>{connection.account || "—"}</div>
              </div>
              {connection.propertyKind || connection.matchedGscSiteUrl ? (
                <div>
                  <span className="text-muted-foreground">Search Console property</span>
                  <div>
                    {connection.propertyKind === "domain"
                      ? "Domain"
                      : connection.propertyKind === "url_prefix"
                        ? "URL-prefix"
                        : "—"}
                    {connection.matchedGscSiteUrl ? ` · ${connection.matchedGscSiteUrl}` : ""}
                  </div>
                </div>
              ) : null}
              <div>
                <span className="text-muted-foreground">Project</span>
                <div>{connection.project || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Auth method</span>
                <div>{connection.authMethod || "none"}</div>
              </div>
            </div>
            {isAds ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">OAuth (Ads)</span>
                  <div>{marketingGoogleAds?.oauthConnected ? "Connected" : "Not connected"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Developer token</span>
                  <div>{marketingGoogleAds?.hasDeveloperToken ? "Configured" : "Missing"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">MCC / login customer</span>
                  <div>
                    {marketingGoogleAds?.hasLoginCustomerId
                      ? marketingGoogleAds.loginCustomerId || "Configured"
                      : "Missing"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Ads customer</span>
                  <div>{marketingGoogleAds?.customerId || "—"}</div>
                </div>
              </div>
            ) : null}
            {isAds &&
            marketingGoogleAds?.legacySeoCustomerIdHint &&
            (marketingGoogleAds.accountCount ?? 0) === 0 ? (
              <p className="text-amber-700 dark:text-amber-300">
                Customer ID {marketingGoogleAds.legacySeoCustomerIdHint} is configured.{" "}
                {marketingGoogleAds.oauthConnected ? (
                  <>
                    <Link
                      href="/admin/marketing/ad-accounts"
                      className="font-medium underline underline-offset-2"
                    >
                      Sync Ad Accounts
                    </Link>{" "}
                    to import customers from this Google Ads connection.
                  </>
                ) : (
                  <>Connect Google Ads OAuth below, then sync Ad Accounts in Marketing.</>
                )}
              </p>
            ) : null}
            {connection.message &&
            !(
              isBusinessProfile &&
              discovery &&
              !bpRateLimited &&
              isBusinessProfileRateLimitError(connection.message)
            ) ? (
              <p className="text-muted-foreground">{connection.message}</p>
            ) : null}
            {isBusinessProfile && discovery ? (
              <div className="rounded-md border border-border/50 px-3 py-2 text-sm space-y-1">
                <p className="font-medium">Cached discovery</p>
                <p className="text-muted-foreground">
                  Last synced:{" "}
                  {discovery.lastSyncedAt ? (
                    <LocaleDate value={discovery.lastSyncedAt} />
                  ) : (
                    "Not yet"
                  )}
                </p>
                <p className="text-muted-foreground">
                  Account:{" "}
                  {discovery.accounts.find((a) => a.name === discovery.businessAccountId)?.accountName ||
                    discovery.accounts[0]?.accountName ||
                    "—"}
                  {discovery.businessAccountId ? ` (${discovery.businessAccountId})` : ""}
                  {discovery.accounts.length > 1 ? ` · ${discovery.accounts.length} accounts` : ""}
                </p>
                <p className="text-muted-foreground">
                  Location:{" "}
                  {discovery.locations.find((l) => l.name === discovery.locationId)?.title ||
                    discovery.locations[0]?.title ||
                    "—"}
                  {discovery.locationId ? ` (${discovery.locationId})` : ""}
                  {discovery.locations.length > 1 ? ` · ${discovery.locations.length} locations` : ""}
                </p>
                {discovery.locations[0]?.primaryCategory ? (
                  <p className="text-muted-foreground">
                    Primary category: {discovery.locations[0].primaryCategory}
                    {discovery.suggestedEntityType ? ` → ${discovery.suggestedEntityType}` : ""}
                  </p>
                ) : null}
                {discovery.napConflicts && discovery.napConflicts.length > 0 ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    NAP drift: {discovery.napConflicts.join(" · ")}
                  </p>
                ) : null}
                {bpRateLimited ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    Wait, then try once. Do not reconnect.
                    {discovery.rateLimitedUntil
                      ? ` Retry after ${new Date(discovery.rateLimitedUntil).toLocaleString()}.`
                      : ""}
                  </p>
                ) : discovery.lastError && !isBusinessProfileRateLimitError(discovery.lastError) ? (
                  <p className="text-destructive">Sync error: {discovery.lastError}</p>
                ) : !discovery.lastSyncedAt ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    Ready to retry — click Sync locations once.
                  </p>
                ) : null}
              </div>
            ) : null}
            {isAds &&
            marketingGoogleAds?.healthChecks &&
            marketingGoogleAds.healthChecks.length > 0 ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {marketingGoogleAds.healthChecks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border/50 px-2.5 py-1.5 text-xs"
                  >
                    <span>
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="block text-muted-foreground">{item.message}</span>
                    </span>
                    {!item.ok && item.href ? (
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={item.href}>{item.actionLabel}</Link>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <div>
              <span className="text-muted-foreground">OAuth scopes</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {definition.requiredScopes.length === 0 ? (
                  <Badge variant="outline">No OAuth scopes required</Badge>
                ) : (
                  definition.requiredScopes.map((scope) => {
                    const granted = isAds
                      ? Boolean(marketingGoogleAds?.oauthConnected)
                      : connection.grantedScopes.includes(scope);
                    return (
                      <Badge
                        key={scope}
                        variant={granted ? undefined : "outline"}
                        className={granted ? "bg-emerald-600 text-white border-transparent" : ""}
                      >
                        {scope.replace("https://www.googleapis.com/auth/", "")}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {definition.capabilities.supportsOAuth && canStartOAuth ? (
                bpRateLimited ? (
                  <Button size="sm" disabled>
                    {connection.state === "connected" ? "Reconnect" : "Connect"}
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    {/* Plain <a>: Next.js <Link> soft-navigates via RSC fetch; OAuth must be a full-page redirect. */}
                    <a href={`/api/seo/analytics/google/oauth/start?integration=${definition.id}`}>
                      {isAds
                        ? marketingGoogleAds?.oauthConnected
                          ? "Reconnect"
                          : "Connect"
                        : connection.state === "connected"
                          ? "Reconnect"
                          : "Connect"}
                    </a>
                  </Button>
                )
              ) : null}
              <form action={testAction}>
                <input type="hidden" name="integrationId" value={definition.id} />
                <Button type="submit" size="sm" variant="outline" disabled={testPending || bpRateLimited}>
                  Test Connection
                </Button>
              </form>
              {isBusinessProfile ? (
                <form action={opAction}>
                  <input type="hidden" name="integrationId" value={definition.id} />
                  <input type="hidden" name="operationId" value="refresh_location" />
                  <Button type="submit" size="sm" variant="outline" disabled={opPending || bpRateLimited}>
                    Sync locations
                  </Button>
                </form>
              ) : null}
              {isAds ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/marketing/ad-accounts">Open Ad Accounts</Link>
                </Button>
              ) : null}
              <form action={disconnectAction}>
                <input type="hidden" name="integrationId" value={definition.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={disconnectPending}>
                  Disconnect
                </Button>
              </form>
            </div>
            <ActionStatus state={testState} />
            {isBusinessProfile ? <ActionStatus state={opState} /> : null}
            <ActionStatus state={disconnectState} />
            </>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "configuration" ? (
        <Card id={isAds ? "configuration" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>
              {isAds
                ? "Identity (customer + MCC) and developer token are required for Marketing sync."
                : "Service-specific settings (rarely changed)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={configAction} className="space-y-5">
              <input type="hidden" name="integrationId" value={definition.id} />
              {groups.map((group) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-sm font-medium">{group}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {definition.configurationSchema.fields
                      .filter((f) => (f.group ?? "General") === group)
                      .map((field) => {
                        const name = `config.${field.key}`;
                        const value = fieldValue(configuration, field.key);
                        if (field.type === "boolean") {
                          return (
                            <label key={field.key} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name={name}
                                value="true"
                                defaultChecked={value === "true"}
                              />
                              {field.label}
                            </label>
                          );
                        }
                        if (field.type === "textarea" || field.type === "json") {
                          return (
                            <div key={field.key} className="sm:col-span-2 space-y-1">
                              <Label htmlFor={name}>{field.label}</Label>
                              <Textarea
                                id={name}
                                name={name}
                                defaultValue={field.type === "json" ? "" : value}
                                placeholder={
                                  field.type === "json"
                                    ? value
                                      ? "•••• saved — leave blank to keep"
                                      : field.placeholder
                                    : field.placeholder
                                }
                                rows={4}
                              />
                            </div>
                          );
                        }
                        if (field.type === "select") {
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label htmlFor={name}>{field.label}</Label>
                              <select
                                id={name}
                                name={name}
                                defaultValue={value}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                              >
                                <option value="">Select…</option>
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        return (
                          <div key={field.key} className="space-y-1">
                            <Label htmlFor={name}>{field.label}</Label>
                            <Input
                              id={name}
                              name={name}
                              type={field.type === "number" ? "number" : field.type === "secret" ? "password" : "text"}
                              defaultValue={field.type === "secret" ? "" : value}
                              placeholder={
                                field.type === "secret"
                                  ? configuration[`has_${field.key}`]
                                    ? "•••• saved — leave blank to keep"
                                    : field.placeholder
                                  : field.placeholder
                              }
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={configPending}>
                Save configuration
              </Button>
              <ActionStatus state={configState} />
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "operational_policy" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operational Policy</CardTitle>
            <CardDescription>Cadence, retries, workers, and runtime controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={policyAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="integrationId" value={definition.id} />
              {[
                ["cadenceMinutes", "Cadence (minutes)", policy.cadenceMinutes],
                ["retryCount", "Retry count", policy.retryCount],
                ["retryBackoffMs", "Retry backoff (ms)", policy.retryBackoffMs],
                ["timeoutMs", "Timeout (ms)", policy.timeoutMs],
                ["parallelRequests", "Parallel requests", policy.parallelRequests],
                ["rateLimitPerMinute", "Rate limit / minute", policy.rateLimitPerMinute ?? 60],
              ].map(([name, label, value]) => (
                <div key={String(name)} className="space-y-1">
                  <Label htmlFor={String(name)}>{label}</Label>
                  <Input
                    id={String(name)}
                    name={String(name)}
                    type="number"
                    defaultValue={Number(value)}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="workerEnabled" value="true" defaultChecked={policy.workerEnabled} />
                Worker enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="dryRunDefault" value="true" defaultChecked={policy.dryRunDefault} />
                Dry-run by default
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="notificationOnFailure"
                  value="true"
                  defaultChecked={policy.notificationOnFailure}
                />
                Notify on failure
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="notificationOnQuotaWarning"
                  value="true"
                  defaultChecked={policy.notificationOnQuotaWarning}
                />
                Notify on quota warning
              </label>
              <div className="space-y-1">
                <Label htmlFor="errorRecovery">Error recovery</Label>
                <select
                  id="errorRecovery"
                  name="errorRecovery"
                  defaultValue={policy.errorRecovery ?? "auto_retry"}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="auto_retry">Auto retry</option>
                  <option value="manual">Manual</option>
                  <option value="skip">Skip</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={policyPending}>
                  Save operational policy
                </Button>
                <ActionStatus state={policyState} />
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "validation" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>Test connection and dry-run validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={testAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="integrationId" value={definition.id} />
              {definition.capabilities.supportsDryRun ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="dryRun" value="true" />
                  Dry-run
                </label>
              ) : null}
              <Button type="submit" size="sm" disabled={testPending || bpRateLimited}>
                Run validation
              </Button>
            </form>
            <ActionStatus state={testState} />
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "operations" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operations</CardTitle>
            <CardDescription>Run-now actions from the operations catalog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {definition.operations.map((operation) => (
              <form
                key={operation.id}
                action={opAction}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{operation.title}</div>
                    <div className="text-xs text-muted-foreground">{operation.description}</div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      opPending ||
                      (bpRateLimited && operation.id === "refresh_location")
                    }
                  >
                    Run
                  </Button>
                </div>
                <input type="hidden" name="integrationId" value={definition.id} />
                <input type="hidden" name="operationId" value={operation.id} />
                {(operation.parameters ?? []).map((param) => (
                  <div key={param.key} className="space-y-1">
                    <Label htmlFor={`${operation.id}.${param.key}`}>{param.label}</Label>
                    {param.type === "select" ? (
                      <select
                        id={`${operation.id}.${param.key}`}
                        name={`param.${param.key}`}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      >
                        {(param.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`${operation.id}.${param.key}`}
                        name={`param.${param.key}`}
                        type={param.type === "number" ? "number" : "text"}
                        required={param.required}
                      />
                    )}
                  </div>
                ))}
                {operation.supportsDryRun ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="dryRun" value="true" />
                    Dry-run
                  </label>
                ) : null}
              </form>
            ))}
            <ActionStatus state={opState} />
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "monitoring" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monitoring</CardTitle>
            <CardDescription>Current health, quota, and job pressure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">Health</div>
              <div className="text-lg font-semibold">{monitoring.health.score}%</div>
              <div>{monitoring.health.message}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Quota</div>
              <div className="text-lg font-semibold">
                {monitoring.quota
                  ? `${monitoring.quota.current} / ${monitoring.quota.maximum}`
                  : "—"}
              </div>
              <div>{monitoring.quota?.label ?? "No quota provider"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jobs</div>
              <div className="text-lg font-semibold">
                {monitoring.runningJobs} running · {monitoring.pendingJobs} pending
              </div>
              <div>
                Last sync: <LocaleDate value={monitoring.lastSyncAt} />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Auth</div>
              <div>{monitoring.health.authentication}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Worker</div>
              <div>{monitoring.health.workerState}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors / warnings</div>
              <div>
                {monitoring.errors} / {monitoring.warnings}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "permissions" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Permissions & Scopes</CardTitle>
            <CardDescription>Required scopes versus granted scopes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {definition.requiredScopes.length === 0 ? (
              <p className="text-muted-foreground">This integration does not require OAuth scopes.</p>
            ) : (
              definition.requiredScopes.map((scope) => {
                const granted = connection.grantedScopes.includes(scope);
                return (
                  <div key={scope} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <span className="truncate">{scope}</span>
                    <Badge variant={granted ? undefined : "outline"} className={granted ? "bg-emerald-600 text-white border-transparent" : ""}>
                      {granted ? "granted" : "missing"}
                    </Badge>
                  </div>
                );
              })
            )}
            {connection.missingScopes.length > 0 ? (
              <p className="text-amber-700 dark:text-amber-300">
                Reconnect to grant missing scopes before running blocked operations.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "history" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Logs & History</CardTitle>
            <CardDescription>Executed operations, connection changes, and failures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              history.slice(0, 20).map((entry) => (
                <div key={entry.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{entry.title}</span>
                    <span className="text-xs text-muted-foreground">
                      <LocaleDate value={entry.timestamp} />
                    </span>
                  </div>
                  <div className="text-muted-foreground">{entry.detail}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
