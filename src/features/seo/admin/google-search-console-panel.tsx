"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import {
  upsertGoogleIntegrationAction,
  type SeoActionResult,
} from "@/features/seo/actions";
import {
  findMissingOAuthRedirectUri,
  parseGoogleOAuthCredentialsJson,
} from "@/features/seo/integrations/google-oauth-credentials";
import type { PublicSeoIntegrationProviderConfig, SeoProviderHealth } from "@/features/seo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleIntegrationStatus } from "./google-integration-status";

type GoogleSearchConsolePanelProps = {
  google: PublicSeoIntegrationProviderConfig;
  health: SeoProviderHealth[];
  canStartGoogleOAuth: boolean;
  siteUrl: string;
  sitemapUrl: string;
  embedded?: boolean;
};

function buildGoogleAdminUrl(params: URLSearchParams) {
  params.set("tab", "search-console");
  return `/admin/seo/google?${params.toString()}`;
}

export function GoogleSearchConsolePanel({
  google,
  health,
  canStartGoogleOAuth,
  siteUrl,
  sitemapUrl,
  embedded = false,
}: GoogleSearchConsolePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthJsonInputRef = useRef<HTMLInputElement>(null);
  const [oauthCallbackUri, setOauthCallbackUri] = useState<string | null>(null);
  const [clientId, setClientId] = useState(google.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [importJson, setImportJson] = useState("");
  const [showImportPaste, setShowImportPaste] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [saveState, saveAction, savePending] = useActionState<
    SeoActionResult | null,
    FormData
  >(upsertGoogleIntegrationAction, null);
  const prevSavePending = useRef(false);

  const formKey = [
    google.enabled,
    google.analyticsEnabled,
    google.siteUrl,
    google.clientId,
    google.ga4PropertyId,
    google.hasBearerToken,
    google.hasClientSecret,
    google.hasRefreshToken,
  ].join("|");

  useEffect(() => {
    setOauthCallbackUri(`${window.location.origin}/api/seo/analytics/google/oauth/callback`);
  }, []);

  useEffect(() => {
    setClientId(google.clientId ?? "");
    setClientSecret("");
    setImportJson("");
    setImportStatus(null);
  }, [formKey, google.clientId]);

  useEffect(() => {
    const justFinishedSave = prevSavePending.current && !savePending && saveState?.ok;
    prevSavePending.current = savePending;
    if (!justFinishedSave) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("googleSaved", "1");
    router.replace(buildGoogleAdminUrl(params), { scroll: false });
    router.refresh();
  }, [savePending, saveState, router, searchParams]);

  const dismissGoogleSaved = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("googleSaved");
    router.replace(buildGoogleAdminUrl(params), { scroll: false });
  };

  const googleSaved = searchParams.get("googleSaved") === "1";
  const googleOAuthStatus = searchParams.get("googleOAuth") ?? undefined;
  const googleOAuthMessage = searchParams.get("message") ?? undefined;

  const setupHint = useMemo(() => {
    if (googleOAuthStatus === "missing_client_id") {
      return "Google OAuth client ID is required. Save an OAuth client ID below or set GOOGLE_SEARCH_CONSOLE_CLIENT_ID in your environment.";
    }
    return null;
  }, [googleOAuthStatus]);

  const expectedRedirectUri =
    oauthCallbackUri ?? `${siteUrl}/api/seo/analytics/google/oauth/callback`;

  const applyOAuthClientJson = (rawText: string) => {
    setImportStatus(null);
    const text = rawText.trim();
    if (!text) {
      setImportStatus({ tone: "error", message: "Paste or choose a Google OAuth client JSON file first." });
      return;
    }

    try {
      const parsed = parseGoogleOAuthCredentialsJson(JSON.parse(text));
      setClientId(parsed.clientId);
      setClientSecret(parsed.clientSecret);

      const projectLabel = parsed.projectId ? ` (project ${parsed.projectId})` : "";
      const missingRedirect = findMissingOAuthRedirectUri(parsed.redirectUris, expectedRedirectUri);
      if (missingRedirect) {
        setImportStatus({
          tone: "warning",
          message: `Imported OAuth client${projectLabel}. Add this redirect URI in Google Cloud Console, then save: ${expectedRedirectUri}`,
        });
      } else {
        setImportStatus({
          tone: "success",
          message: `Imported OAuth client${projectLabel}. Save Google settings, then click Connect Google.`,
        });
      }
    } catch (error) {
      setImportStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not parse OAuth client JSON.",
      });
    }
  };

  const handleOAuthJsonFile = async (file: File) => {
    try {
      await applyOAuthClientJson(await file.text());
    } catch {
      setImportStatus({ tone: "error", message: "Could not read the selected JSON file." });
    } finally {
      if (oauthJsonInputRef.current) {
        oauthJsonInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "max-w-3xl space-y-6"}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Search Console &amp; Analytics API</h2>
        <p className="text-sm text-muted-foreground">
          Connect Google for Search Console sitemap submission, search performance import, and GA4
          analytics ingestion in the admin dashboard.
        </p>
      </div>

      {setupHint ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {setupHint}
        </p>
      ) : null}

      <form key={formKey} action={saveAction} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              Google Search Console
              <label className="inline-flex items-center gap-2 text-sm font-normal">
                <input type="checkbox" name="google.enabled" value="true" defaultChecked={google.enabled} />
                Enabled
              </label>
            </CardTitle>
            <CardDescription>
              Submit sitemap updates to Search Console using an OAuth bearer token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <GoogleIntegrationStatus
                google={google}
                health={health}
                sitemapUrl={sitemapUrl}
                canStartGoogleOAuth={canStartGoogleOAuth}
                integrationsSaved={googleSaved}
                googleOAuthStatus={googleOAuthStatus}
                googleOAuthMessage={googleOAuthMessage}
                onDismissSaved={dismissGoogleSaved}
              />
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm md:col-span-2">
                <p className="font-medium">Google Search Console setup</p>
                <ul className="mt-2 list-disc space-y-1 ps-4 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Site URL</strong> must match your GSC property exactly (e.g.{" "}
                    <code className="text-xs">{siteUrl}/</code> or{" "}
                    <code className="text-xs">sc-domain:example.com</code>).
                  </li>
                  <li>
                    <strong className="text-foreground">Sitemap URL</strong> submitted via the queue:{" "}
                    <code className="text-xs">{sitemapUrl}</code>
                  </li>
                  <li>
                    Download OAuth client JSON from Google Cloud Console, import it below, save, then connect.
                  </li>
                  <li>Connect OAuth or paste a bearer token, then enable the provider and save.</li>
                </ul>
              </div>
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3 md:col-span-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Import OAuth client JSON</p>
                  <p className="text-xs text-muted-foreground">
                    Google Cloud Console → APIs &amp; Services → Credentials → your OAuth 2.0 Client ID →
                    Download JSON. This fills client ID and client secret together.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={oauthJsonInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleOAuthJsonFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => oauthJsonInputRef.current?.click()}
                  >
                    <Upload className="me-2 size-4" />
                    Import JSON file
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImportPaste((value) => !value)}
                  >
                    {showImportPaste ? "Hide paste field" : "Paste JSON instead"}
                  </Button>
                </div>
                {showImportPaste ? (
                  <div className="space-y-2">
                    <Textarea
                      value={importJson}
                      onChange={(event) => setImportJson(event.target.value)}
                      rows={5}
                      className="font-mono text-xs"
                      placeholder='{"web":{"client_id":"...","client_secret":"GOCSPX-..."}}'
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => applyOAuthClientJson(importJson)}
                    >
                      Apply pasted JSON
                    </Button>
                  </div>
                ) : null}
                {importStatus ? (
                  <p
                    className={
                      importStatus.tone === "error"
                        ? "text-sm text-destructive"
                        : importStatus.tone === "warning"
                          ? "text-sm text-amber-900 dark:text-amber-100"
                          : "text-sm text-emerald-800 dark:text-emerald-200"
                    }
                    role={importStatus.tone === "error" ? "alert" : "status"}
                  >
                    {importStatus.message}
                  </p>
                ) : null}
              </div>
              <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  name="google.analyticsEnabled"
                  value="true"
                  defaultChecked={google.analyticsEnabled}
                />
                Enable analytics ingestion (GSC search performance + GA4 when property ID is set)
              </label>
              <div className="space-y-2">
                <Label>Site URL (GSC property)</Label>
                <Input
                  name="google.siteUrl"
                  defaultValue={google.siteUrl ?? siteUrl}
                  placeholder={siteUrl}
                />
              </div>
              <div className="space-y-2">
                <Label>GA4 property ID</Label>
                <Input
                  name="google.ga4PropertyId"
                  defaultValue={google.ga4PropertyId ?? ""}
                  placeholder="123456789"
                />
                <p className="text-xs text-muted-foreground">
                  Find in Google Analytics Admin → Property settings (numeric ID only).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Bearer token {google.hasBearerToken ? "(saved)" : ""}</Label>
                <Input
                  name="google.bearerToken"
                  placeholder={google.hasBearerToken ? "Leave blank to keep saved token" : "OAuth access token"}
                />
              </div>
              <div className="space-y-2">
                <Label>OAuth client ID</Label>
                <Input
                  name="google.clientId"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="Google OAuth client ID"
                />
              </div>
              <div className="space-y-2">
                <Label>OAuth client secret {google.hasClientSecret ? "(saved)" : ""}</Label>
                <Input
                  name="google.clientSecret"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder={
                    google.hasClientSecret ? "Leave blank to keep saved secret" : "Google OAuth client secret"
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Refresh token {google.hasRefreshToken ? "(saved)" : ""}</Label>
                <Input
                  name="google.refreshToken"
                  placeholder={
                    google.hasRefreshToken ? "Leave blank to keep saved refresh token" : "Google OAuth refresh token"
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Service account JSON {google.hasServiceAccountJson ? "(saved)" : ""}</Label>
                <Textarea
                  name="google.serviceAccountJson"
                  rows={4}
                  className="font-mono text-xs"
                  placeholder="Reserved for service-account based auth automation"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex flex-wrap items-center gap-3">
                  {canStartGoogleOAuth ? (
                    <Button asChild variant="outline" type="button">
                      <a href="/api/seo/analytics/google/oauth/start">
                        Connect Google (Search Console &amp; Analytics)
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" disabled>
                      Connect Google (Search Console &amp; Analytics)
                    </Button>
                  )}
                </div>
                {!canStartGoogleOAuth ? (
                  <p className="text-xs text-muted-foreground">
                    Save OAuth client ID and client secret first, then connect.
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Authorized redirect URI for this domain:{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    {oauthCallbackUri ?? `${siteUrl}/api/seo/analytics/google/oauth/callback`}
                  </code>
                  . Register this exact URL in Google Cloud Console for each distinct domain you use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button type="submit" className="w-fit" disabled={savePending}>
            {savePending ? "Saving…" : "Save Google settings"}
          </Button>
        </div>

        {saveState && !saveState.ok ? (
          <p className="text-sm text-destructive" role="alert">
            {saveState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
