"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRecommendationsAction } from "../actions";
import type { AuditTarget, AuditTargetKind, SeoIssue } from "../types";
import { SeoRecommendationsList } from "./seo-recommendations-list";

const TARGET_KINDS: Array<{ kind: AuditTargetKind; label: string; entityType: string }> = [
  { kind: "page", label: "Page", entityType: "CmsPage" },
  { kind: "product", label: "Product", entityType: "Product" },
  { kind: "post", label: "Post", entityType: "Post" },
  { kind: "static_page", label: "Static Page", entityType: "static_page" },
];

export function RecommendationsClient({
  initialIssues,
}: {
  initialIssues: SeoIssue[];
}) {
  const [kind, setKind] = useState<AuditTargetKind>("page");
  const [entityId, setEntityId] = useState("");
  const [locale, setLocale] = useState("en");
  const [issues, setIssues] = useState(initialIssues);
  const [pending, startTransition] = useTransition();
  const selected = TARGET_KINDS.find((t) => t.kind === kind)!;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Recommended Improvements are Issues with source &quot;recommendation&quot;. Optionally
          analyze a specific Audit Target.
        </p>
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
            <Label htmlFor="rec-entity">Entity ID</Label>
            <Input
              id="rec-entity"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-locale">Locale</Label>
            <Input
              id="rec-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
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
              const next = await getRecommendationsAction(target);
              setIssues(next);
            });
          }}
        >
          {pending ? "Loading…" : "Load improvements"}
        </Button>
      </div>
      <SeoRecommendationsList issues={issues} />
    </div>
  );
}
