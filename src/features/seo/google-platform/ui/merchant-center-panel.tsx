"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateGoogleShoppingFeedAction } from "@/features/feeds/google-shopping-feed.actions";
import { labelForGoogleShoppingIssue } from "@/features/feeds/google-shopping-issues";
import type { GoogleShoppingIssueCode } from "@/features/feeds/google-shopping-issues";
import { GoogleIntegrationPage } from "./integration-page";
import type {
  GoogleConnectionSnapshot,
  GoogleHistoryEntry,
  GoogleIntegrationCapabilities,
  GoogleConfigurationSchema,
  GoogleMonitoringSnapshot,
  GoogleOperationalPolicy,
  GoogleOperationDefinition,
  GoogleServiceConfigMap,
  GoogleIntegrationId,
  GoogleDependency,
} from "../types";

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

type MvpMatch = {
  token: string;
  matched: boolean;
  productId?: string;
  slug?: string;
  title?: string;
  status?: "ready" | "warning" | "excluded";
  inFeed: boolean;
};

type DiagnosticsPayload = {
  feedVersion: number;
  summary: {
    published: number;
    ready: number;
    warnings: number;
    excluded: number;
    feedItems: number;
  };
  issues: Partial<
    Record<
      GoogleShoppingIssueCode,
      { severity: "excluded" | "warning"; count: number; products: Array<{ id: string; slug: string; title: string }> }
    >
  >;
  preview: {
    published: number;
    eligible: number;
    excluded: number;
    warnings: number;
    feedItems: number;
    estimatedVariantExtraRows: number;
    sampleItems: Array<{ id: string; title: string; price: string; link: string }>;
    sampleXmlSnippet: string;
  };
  mvpCampaign?: {
    tokens: string[];
    matches: MvpMatch[];
    summary: {
      defined: number;
      inFeed: number;
      excluded: number;
      missingFromCatalog: number;
    };
    note: string;
  };
  feedHealth: {
    feedUrl: string;
    storeOrigin?: string;
    itemCount: number;
    xmlValid: boolean;
    httpsUrls: boolean;
    storeDomainOk?: boolean;
    storeOriginFinalOk?: boolean;
    wwwApexSuggestion?: string | null;
    marketCurrencyOk: boolean;
    shippingPresent: boolean;
    lastGeneratedAt: string;
    note: string;
  };
  market: {
    country: string;
    language: string;
    defaultCurrency: string;
    destination: string;
    validationMode: string;
    feedUrl: string;
    storeOrigin?: string;
    priceAdjustmentPercent?: number;
    priceAdjustmentDirection?: string;
    availabilityOverride?: string;
    availabilityDate?: string;
  };
};

type ExpandedIssue = GoogleShoppingIssueCode | null;

const SELECT_CLASS =
  "flex h-12 min-h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm";

function cfgBool(configuration: GoogleServiceConfigMap, key: string): boolean {
  return configuration[key] === true || configuration[key] === "true";
}

function cfgStr(configuration: GoogleServiceConfigMap, key: string, fallback = ""): string {
  const value = configuration[key];
  if (value == null || value === "") return fallback;
  return String(value);
}

function cfgNum(configuration: GoogleServiceConfigMap, key: string, fallback = 0): number {
  const value = configuration[key];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDateInputValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return "";
}

function MerchantFeedSection({
  configuration,
  data,
  error,
  loading,
  expanded,
  setExpanded,
  copied,
  setCopied,
  feedUrl,
  validationMode,
  onRefresh,
}: {
  configuration: GoogleServiceConfigMap;
  data: DiagnosticsPayload | null;
  error: string | null;
  loading: boolean;
  expanded: ExpandedIssue;
  setExpanded: (v: ExpandedIssue) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  feedUrl: string;
  validationMode: string;
  onRefresh: () => void;
}) {
  const [percent, setPercent] = useState(() =>
    cfgNum(configuration, "feedPriceAdjustmentPercent", 0),
  );
  const [direction, setDirection] = useState<"increase" | "decrease">(() =>
    cfgStr(configuration, "feedPriceAdjustmentDirection") === "decrease" ? "decrease" : "increase",
  );
  const [availability, setAvailability] = useState(() => cfgStr(configuration, "feedAvailability"));
  const [availabilityDate, setAvailabilityDate] = useState(() =>
    toDateInputValue(cfgStr(configuration, "feedAvailabilityDate")),
  );
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generateOk, setGenerateOk] = useState<boolean | null>(null);

  const needsAvailabilityDate = availability === "backorder" || availability === "preorder";

  async function onGenerate() {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const result = await generateGoogleShoppingFeedAction({
        priceAdjustmentPercent: percent,
        priceAdjustmentDirection: direction,
        availability,
        availabilityDate,
      });
      setGenerateOk(result.ok);
      setGenerateMessage(result.message);
      if (result.ok) onRefresh();
    } catch (e) {
      setGenerateOk(false);
      setGenerateMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Generate feed</CardTitle>
          <CardDescription>
            Apply a list-price percentage and an availability override, then write them into{" "}
            <code>/feeds/google-shopping.xml</code>. Formula: XML price = list price{" "}
            {direction === "decrease" ? "−" : "+"} (percentage × list price).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="feed-price-direction">Price change</Label>
              <select
                id="feed-price-direction"
                className={SELECT_CLASS}
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value === "decrease" ? "decrease" : "increase")
                }
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="feed-price-percent">Percentage</Label>
              <Input
                id="feed-price-percent"
                type="number"
                min={0}
                max={1000}
                step="0.01"
                value={Number.isFinite(percent) ? percent : 0}
                onChange={(e) => setPercent(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="feed-availability">Availability</Label>
              <select
                id="feed-availability"
                className={SELECT_CLASS}
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option value="">Use product stock</option>
                <option value="in stock">In stock</option>
                <option value="out of stock">Out of stock</option>
                <option value="preorder">Preorder</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
            {needsAvailabilityDate ? (
              <div className="space-y-1">
                <Label htmlFor="feed-availability-date">Expected ship date</Label>
                <Input
                  id="feed-availability-date"
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  required
                />
              </div>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {needsAvailabilityDate
              ? "Google requires <g:availability_date> for preorder and backorder (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)."
              : "Leave availability on “Use product stock” to keep each product’s own in-stock status."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void onGenerate()} disabled={generating || loading}>
              {generating ? "Generating…" : "Generate"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={feedUrl} target="_blank" rel="noreferrer">
                Open generated XML
              </a>
            </Button>
          </div>
          {generateMessage ? (
            <p
              className={generateOk ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}
              role="status"
            >
              {generateMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scheduled fetch only</CardTitle>
          <CardDescription>
            Google Merchant Center retrieves this feed directly. This application does not upload
            products through the Google API. Excel is never the production feed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="font-medium text-destructive">
              GMC “Mismatched online store URL” (all products Not approved)
            </div>
            <p className="text-muted-foreground">
              Product <code>g:link</code> must use the <strong>final landing host after redirects</strong>.
              On this site, <code>www.brt-me.com</code> 308-redirects to{" "}
              <code>https://brt-me.com</code> — keep apex in the feed and in GMC. Do not rewrite links
              to <code>www</code>.
            </p>
            <p className="text-muted-foreground">
              Google rejects every item when Business info’s verified website is missing, unclaimed,
              or a different host than Store origin (including <code>www</code> vs apex).
            </p>
            <ol className="list-decimal pl-5 text-muted-foreground space-y-1">
              <li>
                GMC → Business info → Website = <code>https://brt-me.com</code> (not{" "}
                <code>www</code>) → Verify and Claim.
              </li>
              <li>
                Here → Configuration → <strong>Verified store URL</strong> ={" "}
                <code>https://brt-me.com</code>; save.
              </li>
              <li>
                Remove Excel / other production feeds so only scheduled fetch of{" "}
                <code>/feeds/google-shopping.xml</code> remains.
              </li>
              <li>Request a feed fetch in GMC; wait 24–48h+ for UAE/SA to clear.</li>
            </ol>
          </div>
          <div className="rounded-md border border-amber-600/30 bg-background/60 p-3 space-y-1">
            <div className="font-medium">Feed Health green ≠ Google Shopping approved</div>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              <li>
                <strong>AZURA</strong> — What should we send? (Feed Health / diagnostics)
              </li>
              <li>
                <strong>Merchant Center</strong> — What did Google accept? (Approved)
              </li>
              <li>
                <strong>Google Ads</strong> — What can enter an ad auction? (eligibility /
                impressions)
              </li>
            </ul>
            <p className="text-muted-foreground pt-1">
              Launch gate: every product in the{" "}
              <strong>initial campaign product set</strong> is Approved in GMC — not catalog-wide
              approval %. Keep <code>validationMode = standard</code> for the first production
              cycle. Set <strong>Verified store URL</strong> to the exact GMC Business info online
              store (e.g. <code>https://brt-me.com</code>) so product <code>g:link</code> hosts
              match — fixes “Mismatched online store URL”.
            </p>
            <p className="text-muted-foreground text-xs">
              Full operator runbook: <code>docs/phase-3-shopping-go-live.md</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={feedUrl} target="_blank" rel="noreferrer">
                Open Feed
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    feedUrl.startsWith("http")
                      ? feedUrl
                      : `${window.location.origin}${feedUrl.startsWith("/") ? "" : "/"}${feedUrl}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy Feed URL"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://merchants.google.com/" target="_blank" rel="noreferrer">
                Merchant Center Setup
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://ads.google.com/" target="_blank" rel="noreferrer">
                Google Ads
              </a>
            </Button>
            <Button size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh diagnostics"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Go-live checklist (operator)</CardTitle>
          <CardDescription>
            Tick configuration checkboxes below only after each Google-side action is actually
            completed. Checklist flags never change the XML feed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <ChecklistRow
            label="Website verified in GMC"
            done={cfgBool(configuration, "checklistWebsiteVerified")}
          />
          <ChecklistRow
            label="UAE shipping in GMC"
            done={cfgBool(configuration, "checklistGmcShipping")}
          />
          <ChecklistRow
            label="Returns in GMC"
            done={cfgBool(configuration, "checklistReturns")}
          />
          <ChecklistRow
            label="Shopping Ads destination"
            done={cfgBool(configuration, "checklistShoppingAds")}
          />
          <ChecklistRow
            label="Feed registered (scheduled fetch)"
            done={cfgBool(configuration, "checklistFeedRegistered")}
          />
          <ChecklistRow
            label="MVP set Approved in GMC"
            done={cfgBool(configuration, "checklistMvpApproved")}
          />
          <ChecklistRow
            label="Ads linked + campaign live"
            done={cfgBool(configuration, "checklistAdsLinked")}
          />
          <div>
            <div className="text-muted-foreground">Validation mode</div>
            <div className="font-medium">
              {validationMode}
              {validationMode !== "standard" ? (
                <span className="text-amber-700 dark:text-amber-300">
                  {" "}
                  — prefer standard for first launch cycle
                </span>
              ) : (
                <span className="text-muted-foreground"> (correct for launch)</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Feed Health (AZURA send status)</CardTitle>
              <CardDescription>{data.feedHealth.note}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <Metric label="URL" value={data.feedHealth.feedUrl} />
              <Metric
                label="Store origin"
                value={data.feedHealth.storeOrigin || data.market.storeOrigin || "—"}
              />
              <Metric label="Items" value={String(data.feedHealth.itemCount)} />
              <Metric label="XML Valid" value={data.feedHealth.xmlValid ? "✓" : "✗"} />
              <Metric label="HTTPS URLs" value={data.feedHealth.httpsUrls ? "✓" : "✗"} />
              <Metric
                label="Store domain (g:link)"
                value={data.feedHealth.storeDomainOk === false ? "✗" : "✓"}
              />
              <Metric
                label="Final host (not www)"
                value={data.feedHealth.storeOriginFinalOk === false ? "✗" : "✓"}
              />
              <Metric
                label={`${data.market.defaultCurrency} prices`}
                value={data.feedHealth.marketCurrencyOk ? "✓" : "✗"}
              />
              <Metric label="Shipping" value={data.feedHealth.shippingPresent ? "✓" : "✗"} />
              {data.feedHealth.storeOriginFinalOk === false && data.feedHealth.wwwApexSuggestion ? (
                <div className="sm:col-span-2 lg:col-span-3 text-destructive text-xs">
                  Store origin uses <code>www</code>. Use apex{" "}
                  <code>{data.feedHealth.wwwApexSuggestion}</code> in GMC Business info and Verified
                  store URL — do not put www in <code>g:link</code> (www redirects to apex).
                </div>
              ) : null}
              <Metric
                label="Last generated"
                value={
                  data.feedHealth.lastGeneratedAt
                    ? new Date(data.feedHealth.lastGeneratedAt).toLocaleString()
                    : "—"
                }
              />
              <Metric label="Feed version" value={String(data.feedVersion)} />
              <Metric
                label="Market"
                value={`${data.market.country} / ${data.market.language} / ${data.market.defaultCurrency}`}
              />
              <Metric
                label="Price adjustment"
                value={
                  (data.market.priceAdjustmentPercent ?? 0) === 0
                    ? "none"
                    : `${data.market.priceAdjustmentDirection === "decrease" ? "−" : "+"}${data.market.priceAdjustmentPercent}%`
                }
              />
              <Metric
                label="Availability override"
                value={data.market.availabilityOverride || "product stock"}
              />
              {data.market.availabilityOverride === "backorder" ||
              data.market.availabilityOverride === "preorder" ? (
                <Metric
                  label="Availability date"
                  value={data.market.availabilityDate || "—"}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Initial campaign product set (MVP)</CardTitle>
              <CardDescription>
                {data.mvpCampaign?.note ||
                  "Define the set in Configuration. Launch when each is Approved in GMC — not by catalog approval %."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!data.mvpCampaign || data.mvpCampaign.summary.defined === 0 ? (
                <p className="text-muted-foreground">
                  No MVP set configured yet. Add product ids, slugs, or MPNs under{" "}
                  <strong>Initial campaign product set</strong> in Configuration (one per line),
                  then refresh.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                      label="Defined"
                      value={String(data.mvpCampaign.summary.defined)}
                    />
                    <Metric
                      label="In AZURA feed"
                      value={String(data.mvpCampaign.summary.inFeed)}
                    />
                    <Metric
                      label="Excluded locally"
                      value={String(data.mvpCampaign.summary.excluded)}
                    />
                    <Metric
                      label="Missing from catalog"
                      value={String(data.mvpCampaign.summary.missingFromCatalog)}
                    />
                  </div>
                  <ul className="space-y-1">
                    {data.mvpCampaign.matches.map((m) => (
                      <li key={m.token} className="flex flex-wrap items-center gap-2">
                        <code className="text-xs">{m.token}</code>
                        {!m.matched ? (
                          <Badge variant="outline">not in catalog</Badge>
                        ) : m.status === "excluded" ? (
                          <Badge
                            variant="outline"
                            className="border-destructive/40 text-destructive"
                          >
                            excluded
                          </Badge>
                        ) : m.status === "warning" ? (
                          <Badge variant="outline">warning · in feed</Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white border-transparent">
                            ready · in feed
                          </Badge>
                        )}
                        {m.slug ? (
                          <Link
                            className="text-primary hover:underline text-xs"
                            href={`/admin/products?q=${encodeURIComponent(m.slug)}`}
                          >
                            {m.title || m.slug}
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Google Shopping Feed Preview</CardTitle>
              <CardDescription>
                Local catalog evaluation — what AZURA would send on the next GMC fetch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Published products" value={String(data.preview.published)} />
                <Metric label="Eligible (ready+warning)" value={String(data.preview.eligible)} />
                <Metric label="Excluded" value={String(data.preview.excluded)} />
                <Metric label="Warnings" value={String(data.preview.warnings)} />
                <Metric label="Feed items" value={String(data.preview.feedItems)} />
                <Metric
                  label="Estimated variant extras"
                  value={String(data.preview.estimatedVariantExtraRows)}
                />
              </div>
              {data.preview.sampleItems.length > 0 ? (
                <div>
                  <div className="font-medium mb-1">Sample items</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {data.preview.sampleItems.map((item) => (
                      <li key={item.id}>
                        <code className="text-xs">{item.id}</code> — {item.title} · {item.price}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground">No eligible items in the feed yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Catalog diagnostics</CardTitle>
              <CardDescription>
                Issue codes from the shared eligibility resolver (not Google approval status).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.keys(data.issues).length === 0 ? (
                <p className="text-muted-foreground">No local issues detected.</p>
              ) : (
                Object.entries(data.issues).map(([code, bucket]) => {
                  if (!bucket) return null;
                  const issue = code as GoogleShoppingIssueCode;
                  const open = expanded === issue;
                  return (
                    <div key={code} className="rounded-md border p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              bucket.severity === "excluded"
                                ? "border-destructive/40 text-destructive"
                                : undefined
                            }
                          >
                            {bucket.severity}
                          </Badge>
                          <span>{labelForGoogleShoppingIssue(issue)}</span>
                          <span className="text-muted-foreground">{bucket.count}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded(open ? null : issue)}
                        >
                          {open ? "Hide" : "View"}
                        </Button>
                      </div>
                      {open ? (
                        <ul className="mt-2 space-y-1 pl-1 text-muted-foreground">
                          {bucket.products.map((p) => (
                            <li key={p.id}>
                              <Link
                                className="text-primary hover:underline"
                                href={`/admin/products?q=${encodeURIComponent(p.slug)}`}
                              >
                                {p.title || p.slug}
                              </Link>{" "}
                              <code className="text-xs">{p.slug}</code>
                            </li>
                          ))}
                          {bucket.count > bucket.products.length ? (
                            <li>…and {bucket.count - bucket.products.length} more</li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export function MerchantCenterPanel(props: {
  definition: SerializableDefinition;
  sections: string[];
  connection: GoogleConnectionSnapshot;
  configuration: GoogleServiceConfigMap;
  policy: GoogleOperationalPolicy;
  monitoring: GoogleMonitoringSnapshot;
  history: GoogleHistoryEntry[];
  dependencyMessage?: string;
  canStartOAuth?: boolean;
}) {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedIssue>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feeds/google-shopping/diagnostics");
      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as DiagnosticsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const feedUrl =
    data?.feedHealth.feedUrl ||
    (typeof props.configuration.feedUrl === "string" ? props.configuration.feedUrl : "") ||
    "/feeds/google-shopping.xml";

  const configSections = props.sections.filter(
    (s) => s !== "operations" && s !== "operational_policy",
  );

  const validationMode =
    data?.market.validationMode ||
    (typeof props.configuration.validationMode === "string"
      ? props.configuration.validationMode
      : "standard");

  return (
    <GoogleIntegrationPage
      definition={props.definition}
      sections={configSections}
      connection={props.connection}
      configuration={props.configuration}
      policy={props.policy}
      monitoring={props.monitoring}
      history={props.history}
      dependencyMessage={props.dependencyMessage}
      canStartOAuth={props.canStartOAuth}
      extraSectionsFirst
      extraSections={[
        {
          id: "feed",
          label: "Feed",
          content: (
            <MerchantFeedSection
              configuration={props.configuration}
              data={data}
              error={error}
              loading={loading}
              expanded={expanded}
              setExpanded={setExpanded}
              copied={copied}
              setCopied={setCopied}
              feedUrl={feedUrl}
              validationMode={validationMode}
              onRefresh={() => void load()}
            />
          ),
        },
      ]}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-2">
      <Badge
        variant={done ? undefined : "outline"}
        className={done ? "bg-emerald-600 text-white border-transparent" : ""}
      >
        {done ? "Done" : "Pending"}
      </Badge>
      <span>{label}</span>
    </div>
  );
}
