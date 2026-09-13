"use client";

import { cn } from "@/lib/utils";

export type GooglePreviewSitelinkCandidate = {
  title: string;
  description?: string;
  href?: string;
};

export type GoogleRichResultPreviewProps = {
  /** Tier A — controllable */
  faviconUrl?: string | null;
  siteName?: string;
  title: string;
  description: string;
  url: string;
  /** Tier B — page-specific eligible schema */
  detectedSchemaTypes?: string[];
  schemaFeatureLabels?: Record<string, string>;
  /** Tier C — brand simulation */
  sitelinkCandidates?: GooglePreviewSitelinkCandidate[];
  showBrandSimulation?: boolean;
  className?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-muted-foreground/40")} />
  );
}

export function GoogleRichResultPreview({
  faviconUrl,
  siteName,
  title,
  description,
  url,
  detectedSchemaTypes = [],
  schemaFeatureLabels = {},
  sitelinkCandidates = [],
  showBrandSimulation = false,
  className,
}: GoogleRichResultPreviewProps) {
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          A. Controllable search result
        </p>
        <div className="rounded-lg border bg-background p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl} alt="" className="h-4 w-4 rounded-full" />
            ) : (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px]">
                {(siteName ?? displayUrl).charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate">{siteName ?? displayUrl}</span>
          </div>
          <p className="text-lg text-[#1a0dab] leading-snug line-clamp-2 dark:text-[#8ab4f8]">
            {title || "Page title"}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">{displayUrl}</p>
          <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2">
            {description || "Meta description"}
          </p>
        </div>
      </div>

      {detectedSchemaTypes.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            B. Eligible enhanced result — detected on this page
          </p>
          <div className="rounded-lg border p-3 space-y-2">
            {detectedSchemaTypes.map((schemaType) => (
              <div key={schemaType} className="flex items-start gap-2 text-sm">
                <StatusDot ok />
                <div>
                  <p className="font-medium">{schemaType}</p>
                  <p className="text-xs text-muted-foreground">
                    Potential Google feature: {schemaFeatureLabels[schemaType] ?? "Structured-data signal"}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Valid structured data does not guarantee rich-result appearance — Google decides.
            </p>
          </div>
        </div>
      ) : null}

      {showBrandSimulation ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            C. Brand search simulation
          </p>
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <p className="text-lg text-[#1a0dab] dark:text-[#8ab4f8] line-clamp-2">{title}</p>
            <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2">{description}</p>
            {sitelinkCandidates.length > 0 ? (
              <div className="pt-2 space-y-2 border-t">
                <p className="text-xs text-muted-foreground">Potential sitelink candidates</p>
                {sitelinkCandidates.map((link) => (
                  <div key={link.title} className="pl-2 border-l-2 border-muted">
                    <p className="text-sm text-[#1a0dab] dark:text-[#8ab4f8]">{link.title}</p>
                    {link.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">{link.description}</p>
                    ) : null}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">More results from {displayUrl.split("/")[0]} »</p>
              </div>
            ) : null}
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Simulation — Google decides whether these elements appear.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
