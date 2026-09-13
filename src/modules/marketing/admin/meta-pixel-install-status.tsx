"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { verifyMetaPixelLiveAction } from "@/modules/marketing/actions";
import { resolveMetaPixelInitScript } from "@/modules/marketing/tracking/meta-pixel";
import type { MetaPixelLiveVerifyResult } from "@/modules/marketing/tracking/verify-meta-pixel-live.types";

type Props = {
  installed: boolean;
  pixelId: string | null;
  headSnippet?: string;
  siteUrl?: string;
};

function formatFetchedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function liveResultMessage(result: MetaPixelLiveVerifyResult): string {
  if (result.error) return result.error;
  if (result.found) {
    return "Meta Pixel signals found in the public homepage HTML (fbq / fbevents.js and Pixel ID).";
  }
  const missing: string[] = [];
  if (!result.signals.fbq && !result.signals.fbeventsJs) {
    missing.push("fbq / fbevents.js");
  }
  if (!result.signals.pixelIdInHtml) missing.push("Pixel ID");
  return missing.length
    ? `Not detected in HTML — missing: ${missing.join(", ")}. Confirm Pixel is enabled, saved, and the public URL is correct.`
    : "Not detected in public HTML.";
}

export function MetaPixelInstallStatus({ installed, pixelId, headSnippet, siteUrl }: Props) {
  const [liveResult, setLiveResult] = useState<MetaPixelLiveVerifyResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewScript =
    pixelId && installed
      ? resolveMetaPixelInitScript(pixelId, headSnippet)
      : null;

  function handleLiveCheck() {
    if (!siteUrl || !pixelId) return;
    startTransition(async () => {
      const result = await verifyMetaPixelLiveAction({
        siteUrl,
        expectedPixelId: pixelId,
      });
      setLiveResult(result);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          Install status
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              installed
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {installed ? "Installed on public site" : "Not installed"}
          </span>
        </CardTitle>
        <CardDescription>
          {installed && pixelId
            ? `Meta Pixel (${pixelId}) is configured to inject into the page <head> on locale marketing pages via beforeInteractive.`
            : pixelId
              ? "Saved but not active — enable Pixel and save to install on the public site."
              : "Enable Pixel, enter a Pixel ID or paste base code, and save."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {previewScript ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Head script preview (what we inject into {"<head>"})
            </p>
            <pre className="max-h-48 overflow-auto rounded-md border border-border/70 bg-muted/30 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
              {previewScript}
            </pre>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {siteUrl ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                Open public site
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!installed || !pixelId || !siteUrl || isPending}
            onClick={handleLiveCheck}
            className="gap-1.5"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Check live site
          </Button>
        </div>

        {liveResult ? (
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
              liveResult.error
                ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                : liveResult.found
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
            role="status"
          >
            {liveResult.error ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : liveResult.found ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                {liveResult.error
                  ? "Fetch error"
                  : liveResult.found
                    ? "Detected"
                    : "Not detected"}
              </p>
              <p className="text-xs opacity-90">{liveResultMessage(liveResult)}</p>
              <p className="text-[11px] opacity-70">
                Checked {formatFetchedAt(liveResult.fetchedAt)}
                {liveResult.url ? ` · ${liveResult.url}` : ""}
              </p>
            </div>
          </div>
        ) : null}

        {siteUrl && installed ? (
          <p className="text-xs text-muted-foreground">
            After save, verify with Meta Pixel Helper or Events Manager Test Events using{" "}
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {siteUrl}
            </a>
            . View page source and look for the script in {"<head>"}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
