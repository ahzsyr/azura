"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EntityReadinessPanel } from "@/features/seo/components/entity-readiness-panel";
import { GoogleRichResultPreview } from "@/features/seo/components/google-rich-result-preview";
import { GoogleKnowledgePanelPreview } from "@/features/seo/components/google-knowledge-panel-preview";
import { googleFeatureRelevanceForType } from "@/features/seo/quality/schema-graph-audit.constants";
import type { StructuredDataAuditBundle } from "@/features/seo/quality/schema-graph-audit.types";
import { PUBLIC_SCHEMA_AUDIT_ROUTES } from "@/features/seo/quality/public-schema-audit-routes";
import { runStructuredDataAuditAction } from "@/features/seo/actions";
import { StructuredDataGoogleInstructions } from "@/features/seo/components/structured-data-google-instructions";

type Props = {
  initialAudit: StructuredDataAuditBundle | null;
  sitemapUrl?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewUrl?: string;
  faviconUrl?: string | null;
  siteName?: string;
  knowledgePanel?: {
    name?: string;
    phone?: string;
    address?: string;
    description?: string;
    logoUrl?: string | null;
    foundingDate?: string;
    socialCount?: number;
  };
  sitelinkCandidates?: Array<{ title: string; description?: string }>;
};

export function StructuredDataAuditPanel({
  initialAudit,
  sitemapUrl,
  previewTitle = "BRT Trading",
  previewDescription = "",
  previewUrl = "https://brt-me.com/en",
  faviconUrl,
  siteName,
  knowledgePanel,
  sitelinkCandidates = [],
}: Props) {
  const [audit, setAudit] = useState(initialAudit);
  const [selectedRoute, setSelectedRoute] = useState(PUBLIC_SCHEMA_AUDIT_ROUTES[0]?.pathname ?? "/en");
  const [isPending, startTransition] = useTransition();
  const [showJson, setShowJson] = useState(false);

  const detectedTypes = audit
    ? audit.graphAudit.schemaRelevance.filter((r) => r.valid).map((r) => r.schemaType)
    : [];

  const featureLabels = Object.fromEntries(
    detectedTypes.map((type) => [type, googleFeatureRelevanceForType(type)]),
  );

  function runAudit(pathname: string) {
    setSelectedRoute(pathname);
    startTransition(async () => {
      const result = await runStructuredDataAuditAction(pathname);
      setAudit(result);
    });
  }

  return (
    <div className="space-y-8">
      <StructuredDataGoogleInstructions sitemapUrl={sitemapUrl} />

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Public HTML audit</h2>
        <p className="text-sm text-muted-foreground">
          Compares the generated canonical graph against published HTML (SSRF-safe). Run after fixing
          missing entity fields so live JSON-LD matches what admin generates.
        </p>
        <div className="flex flex-wrap gap-2">
          {PUBLIC_SCHEMA_AUDIT_ROUTES.map((route) => (
            <Button
              key={route.id}
              type="button"
              size="sm"
              variant={selectedRoute === route.pathname ? "default" : "outline"}
              disabled={isPending}
              onClick={() => runAudit(route.pathname)}
            >
              {route.label}
            </Button>
          ))}
        </div>
        {isPending ? <p className="text-sm text-muted-foreground">Auditing…</p> : null}
      </div>

      {audit ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <EntityReadinessPanel graphAudit={audit.graphAudit} publicAudit={audit.publicAudit} />
            <div className="space-y-4">
              <GoogleRichResultPreview
                faviconUrl={faviconUrl}
                siteName={siteName}
                title={previewTitle}
                description={previewDescription}
                url={previewUrl}
                detectedSchemaTypes={detectedTypes}
                schemaFeatureLabels={featureLabels}
                sitelinkCandidates={sitelinkCandidates}
                showBrandSimulation={selectedRoute === "/en"}
              />
              <GoogleKnowledgePanelPreview
                data={{
                  name: knowledgePanel?.name,
                  category: "Business",
                  description: knowledgePanel?.description,
                  phone: knowledgePanel?.phone,
                  address: knowledgePanel?.address,
                  logoUrl: knowledgePanel?.logoUrl,
                  foundingDate: knowledgePanel?.foundingDate,
                  socialProfiles: knowledgePanel?.socialCount
                    ? Array(knowledgePanel.socialCount).fill("profile")
                    : [],
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Generated graph</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowJson((v) => !v)}>
                {showJson ? "Hide JSON-LD" : "View JSON-LD"}
              </Button>
            </div>
            {!showJson ? (
              <ul className="text-sm space-y-1">
                {audit.graphAudit.graphSummary.map((node, index) => (
                  <li key={`${node.type}-${node.id ?? index}`} className="font-mono text-xs">
                    {node.type}
                    {node.id ? ` — ${node.id}` : ""} ({node.propertyCount} properties)
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="text-xs overflow-auto max-h-96 rounded bg-muted p-3">{audit.graphJson}</pre>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Could not build structured-data audit for this site.</p>
      )}
    </div>
  );
}
