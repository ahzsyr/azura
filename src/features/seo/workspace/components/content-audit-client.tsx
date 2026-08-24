"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContentAuditAction } from "../actions";
import type { AuditTarget, AuditTargetKind, SeoContentAuditVm } from "../types";
import { SeoMetadataPreview } from "./seo-metadata-preview";
import { SeoUnifiedScorePanel } from "./seo-unified-score-panel";
import { SeoDeveloperDetailsPanel } from "./seo-developer-details";
import { SeoIssuesTable } from "./seo-issues-table";

const TARGET_KINDS: Array<{ kind: AuditTargetKind; label: string; entityType: string }> = [
  { kind: "page", label: "Page", entityType: "CmsPage" },
  { kind: "product", label: "Product", entityType: "Product" },
  { kind: "collection", label: "Collection", entityType: "Collection" },
  { kind: "post", label: "Post", entityType: "Post" },
  { kind: "static_page", label: "Static Page", entityType: "static_page" },
  { kind: "url", label: "URL", entityType: "static_page" },
];

const STRUCTURE_ROWS: Array<{ key: keyof SeoContentAuditVm["structure"]; label: string }> = [
  { key: "h1Count", label: "H1" },
  { key: "h2Count", label: "H2" },
  { key: "paragraphCount", label: "Paragraphs" },
  { key: "listCount", label: "Lists" },
  { key: "imageCount", label: "Images" },
  { key: "videoCount", label: "Videos" },
  { key: "tableCount", label: "Tables" },
  { key: "linkCount", label: "Links" },
  { key: "internalLinkCount", label: "Internal Links" },
  { key: "externalLinkCount", label: "External Links" },
  { key: "wordCount", label: "Word Count" },
  { key: "readingTimeMin", label: "Reading Time (min)" },
];

export function ContentAuditClient({
  initialLocale = "en",
}: {
  initialLocale?: string;
}) {
  const [kind, setKind] = useState<AuditTargetKind>("page");
  const [entityId, setEntityId] = useState("");
  const [locale, setLocale] = useState(initialLocale);
  const [result, setResult] = useState<SeoContentAuditVm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = TARGET_KINDS.find((t) => t.kind === kind)!;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Audit Target</p>
          <p className="text-xs text-muted-foreground mt-1">
            Choose what to analyze. Internally this maps to entity type, id, and locale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TARGET_KINDS.map((t) => (
            <Button
              key={t.kind}
              type="button"
              size="sm"
              variant={kind === t.kind ? "default" : "outline"}
              onClick={() => setKind(t.kind)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="audit-entity-id">
              {kind === "url" ? "URL or page key" : "Entity ID"}
            </Label>
            <Input
              id="audit-entity-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={kind === "static_page" ? "home" : "entity id"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-locale">Locale</Label>
            <Input
              id="audit-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en"
            />
          </div>
        </div>
        <Button
          disabled={pending || !entityId.trim()}
          onClick={() => {
            const target: AuditTarget = {
              kind,
              entityType: selected.entityType,
              entityId: entityId.trim(),
              locale: locale.trim() || "en",
            };
            startTransition(async () => {
              setError(null);
              try {
                const vm = await getContentAuditAction(target);
                setResult(vm);
              } catch (err) {
                setResult(null);
                setError(err instanceof Error ? err.message : String(err));
              }
            });
          }}
        >
          {pending ? "Analyzing…" : "Analyze content"}
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      {result && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">SEO Health</h2>
            <SeoUnifiedScorePanel score={result.score} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Content Structure</h2>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {STRUCTURE_ROWS.map((row) => (
                <div key={row.key} className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {String(result.structure[row.key])}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">FAQ</p>
                <p className="text-lg font-semibold">{result.structure.hasFaq ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">CTA</p>
                <p className="text-lg font-semibold">{result.structure.hasCta ? "Yes" : "No"}</p>
              </div>
            </div>
            {result.structure.headings.length > 0 && (
              <ul className="rounded-lg border divide-y text-sm">
                {result.structure.headings.slice(0, 20).map((h, i) => (
                  <li key={`${h.level}-${i}`} className="px-3 py-2 flex gap-3">
                    <span className="font-mono text-xs text-muted-foreground w-8">H{h.level}</span>
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Metadata Preview</h2>
            <SeoMetadataPreview metadata={result.metadata} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Issues</h2>
            <SeoIssuesTable issues={result.issues} />
          </section>

          <SeoDeveloperDetailsPanel details={result.developer} />
        </>
      )}
    </div>
  );
}
