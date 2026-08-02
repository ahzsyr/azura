"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SeoTrackingConfig, SeoTrackingMode } from "@/features/seo/types";
import {
  buildGtagInstallSnippet,
  buildGtmBodySnippet,
  buildGtmHeadSnippet,
} from "@/features/seo/tracking/install-snippet";
import {
  extractGtmContainerIdFromSnippet,
  extractMeasurementIdFromSnippet,
} from "@/features/seo/tracking/parse-tracking-snippets";
import {
  isGtagSiteTrackingConfigured,
  isGtmSiteTrackingConfigured,
  isGtagTrackingEnabled,
  isGtmTrackingEnabled,
  isTrackingConfigured,
  normalizeGtmContainerId,
  normalizeMeasurementId,
} from "@/features/seo/tracking/resolve-tracking";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  config: SeoTrackingConfig;
  envFallbackGaId?: string;
  siteUrl?: string;
  embedded?: boolean;
  /** When set, show only GA4 gtag or GTM fields (used by the unified Google admin page). */
  focus?: "gtag" | "gtm";
};

function defaultGtagSnippet(id: string) {
  return buildGtagInstallSnippet(normalizeMeasurementId(id) ?? "G-XXXXXXXXXX");
}

function defaultGtmSnippets(id: string) {
  const containerId = normalizeGtmContainerId(id) ?? "GTM-XXXXXXX";
  return {
    head: buildGtmHeadSnippet(containerId),
    body: buildGtmBodySnippet(containerId),
  };
}

function CopySnippetButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

type EditableSnippetFieldProps = {
  id: string;
  name: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

function EditableSnippetField({
  id,
  name,
  label,
  hint,
  value,
  onChange,
  rows = 8,
}: EditableSnippetFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <CopySnippetButton text={value} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={false}
        className="font-mono text-xs leading-relaxed"
      />
    </div>
  );
}

export function GoogleTagsSettingsClient({
  config,
  envFallbackGaId,
  siteUrl,
  embedded = false,
  focus,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const resolvedMode: SeoTrackingMode = focus ?? config.mode ?? "gtag";
  const [gtagEnabled, setGtagEnabled] = useState(isGtagTrackingEnabled(config));
  const [gtmEnabled, setGtmEnabled] = useState(isGtmTrackingEnabled(config));
  const [enabled, setEnabled] = useState(config.enabled ?? false);
  const [mode, setMode] = useState<SeoTrackingMode>(resolvedMode);
  const [measurementId, setMeasurementId] = useState(config.measurementId ?? "");
  const [gtmContainerId, setGtmContainerId] = useState(config.gtmContainerId ?? "");
  const [gtagHeadSnippet, setGtagHeadSnippet] = useState(
    config.gtagHeadSnippet ??
      defaultGtagSnippet(config.measurementId ?? envFallbackGaId ?? "G-XXXXXXXXXX"),
  );
  const [gtmHeadSnippet, setGtmHeadSnippet] = useState(
    config.gtmHeadSnippet ?? defaultGtmSnippets(config.gtmContainerId ?? "GTM-XXXXXXX").head,
  );
  const [gtmBodySnippet, setGtmBodySnippet] = useState(
    config.gtmBodySnippet ?? defaultGtmSnippets(config.gtmContainerId ?? "GTM-XXXXXXX").body,
  );

  useEffect(() => {
    if (focus) setMode(focus);
  }, [focus]);

  const handleSave = useCallback(async () => {
    formRef.current?.requestSubmit();
  }, []);

  const handleCancel = useCallback(() => {
    formRef.current?.reset();
    setGtagEnabled(isGtagTrackingEnabled(config));
    setGtmEnabled(isGtmTrackingEnabled(config));
    setEnabled(config.enabled ?? false);
    setMode(focus ?? config.mode ?? "gtag");
    setMeasurementId(config.measurementId ?? "");
    setGtmContainerId(config.gtmContainerId ?? "");
    setGtagHeadSnippet(
      config.gtagHeadSnippet ??
        defaultGtagSnippet(config.measurementId ?? envFallbackGaId ?? "G-XXXXXXXXXX"),
    );
    const gtmDefaults = defaultGtmSnippets(config.gtmContainerId ?? "GTM-XXXXXXX");
    setGtmHeadSnippet(config.gtmHeadSnippet ?? gtmDefaults.head);
    setGtmBodySnippet(config.gtmBodySnippet ?? gtmDefaults.body);
  }, [config, envFallbackGaId, focus]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  const activeMode = focus ?? mode;

  const handleMeasurementIdChange = useCallback((value: string) => {
    setMeasurementId(value);
    const normalized = normalizeMeasurementId(value);
    if (normalized) {
      setGtagHeadSnippet(buildGtagInstallSnippet(normalized));
    }
  }, []);

  const handleGtmContainerIdChange = useCallback((value: string) => {
    setGtmContainerId(value);
    const normalized = normalizeGtmContainerId(value);
    if (normalized) {
      setGtmHeadSnippet(buildGtmHeadSnippet(normalized));
      setGtmBodySnippet(buildGtmBodySnippet(normalized));
    }
  }, []);

  const handleGtagSnippetChange = useCallback((value: string) => {
    setGtagHeadSnippet(value);
    const extracted = extractMeasurementIdFromSnippet(value);
    if (extracted) setMeasurementId(extracted);
  }, []);

  const handleGtmHeadSnippetChange = useCallback((value: string) => {
    setGtmHeadSnippet(value);
    const extracted = extractGtmContainerIdFromSnippet(value);
    if (extracted) setGtmContainerId(extracted);
  }, []);

  const handleGtmBodySnippetChange = useCallback((value: string) => {
    setGtmBodySnippet(value);
    const extracted = extractGtmContainerIdFromSnippet(value);
    if (extracted) setGtmContainerId(extracted);
  }, []);

  const focusEnabled =
    focus === "gtag" ? gtagEnabled : focus === "gtm" ? gtmEnabled : enabled;

  const installed =
    focus === "gtag"
      ? gtagEnabled && Boolean(normalizeMeasurementId(measurementId) ?? extractMeasurementIdFromSnippet(gtagHeadSnippet))
      : focus === "gtm"
        ? gtmEnabled &&
          Boolean(
            normalizeGtmContainerId(gtmContainerId) ??
              extractGtmContainerIdFromSnippet(gtmHeadSnippet) ??
              extractGtmContainerIdFromSnippet(gtmBodySnippet),
          )
        : isTrackingConfigured({
            enabled: true,
            gtagEnabled,
            gtmEnabled,
            mode: activeMode,
            measurementId,
            gtmContainerId,
            gtagHeadSnippet,
            gtmHeadSnippet,
            gtmBodySnippet,
          });

  const savedInstalled =
    focus === "gtm"
      ? isGtmSiteTrackingConfigured(config)
      : focus === "gtag"
        ? isGtagSiteTrackingConfigured(config) ||
          Boolean(envFallbackGaId && config.enabled !== true && !isGtmTrackingEnabled(config))
        : isTrackingConfigured(config);

  const previewId = useMemo(() => {
    if (activeMode === "gtm") {
      return (
        normalizeGtmContainerId(gtmContainerId) ??
        extractGtmContainerIdFromSnippet(gtmHeadSnippet) ??
        extractGtmContainerIdFromSnippet(gtmBodySnippet) ??
        "GTM-XXXXXXX"
      );
    }
    return (
      normalizeMeasurementId(measurementId) ??
      extractMeasurementIdFromSnippet(gtagHeadSnippet) ??
      "G-XXXXXXXXXX"
    );
  }, [activeMode, measurementId, gtmContainerId, gtagHeadSnippet, gtmHeadSnippet, gtmBodySnippet]);

  const savedRecordId =
    focus === "gtm"
      ? config.gtmContainerId
      : focus === "gtag"
        ? config.measurementId ?? envFallbackGaId
        : undefined;

  const title =
    focus === "gtag"
      ? "Google Analytics"
      : focus === "gtm"
        ? "Google Tag Manager"
        : "Google tags";
  const description =
    focus === "gtag"
      ? "Paste your Google tag code below or enter a measurement ID — saved snippets are installed on the public site automatically."
      : focus === "gtm"
        ? "Paste the head and body snippets from Google Tag Manager, or enter a container ID. Saved snippets are installed automatically."
        : "Paste Google install code or enter IDs — saved snippets are installed automatically on the public marketing site.";

  return (
    <div className={embedded ? "space-y-6" : "max-w-3xl space-y-6"}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {envFallbackGaId && !config.enabled && focus !== "gtm" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <strong className="font-medium">Env fallback active:</strong>{" "}
          <code className="text-xs">{envFallbackGaId}</code> from{" "}
          <code className="text-xs">NEXT_PUBLIC_GA_ID</code> is loading until you enable and save
          settings here.
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            Install status
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                savedInstalled
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {savedInstalled ? "Installed on public site" : "Not installed"}
            </span>
          </CardTitle>
          <CardDescription>
            {savedInstalled
              ? focus === "gtm"
                ? `Google Tag Manager (${savedRecordId ?? previewId}) is active on locale marketing pages.`
                : focus === "gtag"
                  ? `Google tag (${savedRecordId ?? previewId}) is active on locale marketing pages.`
                  : activeMode === "gtm"
                    ? `Google Tag Manager (${savedRecordId ?? previewId}) is active on locale marketing pages.`
                    : `Google tag (${savedRecordId ?? previewId}) is active on locale marketing pages.`
              : savedRecordId && focus
                ? `Saved but not active — enable tracking and save to install.`
                : "Enable tracking, paste install snippets or enter an ID, and save."}
          </CardDescription>
        </CardHeader>
        {siteUrl && savedInstalled ? (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Verify in Google using{" "}
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {siteUrl}
              </a>
              . Tags load on locale marketing pages (e.g. {siteUrl}/en).
            </p>
          </CardContent>
        ) : null}
      </Card>

      <form
        ref={formRef}
        id="google-tags-settings-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaveStatus("saving");
          try {
            const activeMode = focus ?? mode;
            const payload =
              focus === "gtag"
                ? {
                    mode: "gtag" as const,
                    gtagEnabled,
                    measurementId,
                    gtagHeadSnippet,
                  }
                : focus === "gtm"
                  ? {
                      mode: "gtm" as const,
                      gtmEnabled,
                      gtmContainerId,
                      gtmHeadSnippet,
                      gtmBodySnippet,
                    }
                  : {
                      mode: activeMode,
                      gtagEnabled,
                      gtmEnabled,
                      enabled,
                      measurementId,
                      gtmContainerId,
                      gtagHeadSnippet,
                      gtmHeadSnippet,
                      gtmBodySnippet,
                    };

            const res = await fetch("/api/admin/seo/tracking", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify(payload),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              throw new Error(data.error ?? `Save failed (${res.status})`);
            }
            markSaved();
            router.refresh();
          } catch {
            setSaveStatus("error");
          }
        }}
        className="space-y-6 rounded-xl border p-6"
      >
        <input type="hidden" name="gtagEnabled" value={gtagEnabled ? "true" : "false"} />
        <input type="hidden" name="gtmEnabled" value={gtmEnabled ? "true" : "false"} />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            value="true"
            checked={focusEnabled}
            onChange={(event) => {
              if (focus === "gtag") {
                setGtagEnabled(event.target.checked);
              } else if (focus === "gtm") {
                setGtmEnabled(event.target.checked);
              } else {
                const nextEnabled = event.target.checked;
                setEnabled(nextEnabled);
                setGtagEnabled(nextEnabled && mode === "gtag");
                setGtmEnabled(nextEnabled && mode === "gtm");
              }
            }}
          />
          Enable{" "}
          {focus === "gtm"
            ? "Google Tag Manager"
            : focus === "gtag"
              ? "Google Analytics"
              : "Google tracking"}{" "}
          on public site
        </label>

        {focus ? <input type="hidden" name="mode" value={focus} /> : null}

        {focus === "gtm" ? (
          <>
            <input type="hidden" name="measurementId" value={measurementId} />
            <input type="hidden" name="gtagHeadSnippet" value={gtagHeadSnippet} />
          </>
        ) : focus === "gtag" ? (
          <>
            <input type="hidden" name="gtmContainerId" value={gtmContainerId} />
            <input type="hidden" name="gtmHeadSnippet" value={gtmHeadSnippet} />
            <input type="hidden" name="gtmBodySnippet" value={gtmBodySnippet} />
          </>
        ) : null}

        {!focus ? (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Install method</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm",
                  mode === "gtag" && "border-primary ring-1 ring-primary/30",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="mode"
                    value="gtag"
                    checked={mode === "gtag"}
                    onChange={() => {
                      setMode("gtag");
                      if (enabled) {
                        setGtagEnabled(true);
                        setGtmEnabled(false);
                      }
                    }}
                  />
                  Google tag (gtag.js)
                </span>
                <span className="text-xs text-muted-foreground">
                  Recommended for GA4 — paste your measurement ID (G-…).
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm",
                  mode === "gtm" && "border-primary ring-1 ring-primary/30",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="mode"
                    value="gtm"
                    checked={mode === "gtm"}
                    onChange={() => {
                      setMode("gtm");
                      if (enabled) {
                        setGtagEnabled(false);
                        setGtmEnabled(true);
                      }
                    }}
                  />
                  Google Tag Manager
                </span>
                <span className="text-xs text-muted-foreground">
                  For multiple tags — use your container ID (GTM-…).
                </span>
              </label>
            </div>
          </fieldset>
        ) : null}

        {(focus ?? mode) === "gtag" ? (
          <div className="space-y-2">
            <Label htmlFor="measurementId">Measurement ID</Label>
            <Input
              id="measurementId"
              name="measurementId"
              value={measurementId}
              onChange={(event) => handleMeasurementIdChange(event.target.value)}
              placeholder="G-FT9BLK7W1T"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Optional shortcut — updates the snippet below. Or paste Google&apos;s code directly
              into the install snippet field.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="gtmContainerId">Container ID</Label>
            <Input
              id="gtmContainerId"
              name="gtmContainerId"
              value={gtmContainerId}
              onChange={(event) => handleGtmContainerIdChange(event.target.value)}
              placeholder="GTM-WT7PVPZK"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Optional shortcut — updates the snippets below. Or paste Google&apos;s install code
              directly.
            </p>
          </div>
        )}

        <div className="space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>{activeMode === "gtm" ? "Install snippets" : "Install snippet"}</Label>
            {focusEnabled && installed ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                Saved snippets are installed on the public site
              </span>
            ) : null}
          </div>

          {activeMode === "gtm" ? (
            <>
              <EditableSnippetField
                id="gtmHeadSnippet"
                name="gtmHeadSnippet"
                label="Head snippet"
                hint="Paste as high in the <head> as possible — copy from Google Tag Manager → Install."
                value={gtmHeadSnippet}
                onChange={handleGtmHeadSnippetChange}
                rows={9}
              />
              <EditableSnippetField
                id="gtmBodySnippet"
                name="gtmBodySnippet"
                label="Body snippet"
                hint="Paste immediately after the opening <body> tag."
                value={gtmBodySnippet}
                onChange={handleGtmBodySnippetChange}
                rows={5}
              />
            </>
          ) : (
            <EditableSnippetField
              id="gtagHeadSnippet"
              name="gtagHeadSnippet"
              label="Head snippet"
              hint="Paste immediately after the opening <head> element — copy from Google Analytics → Install manually."
              value={gtagHeadSnippet}
              onChange={handleGtagSnippetChange}
              rows={10}
            />
          )}
        </div>
      </form>
    </div>
  );
}
