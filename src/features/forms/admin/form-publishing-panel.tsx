"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  publishFormTemplateSnapshotAction,
  rollbackFormTemplateSnapshotAction,
  generateFormSchemaAction,
  installMarketplaceTemplateAction,
} from "@/features/forms/actions";
import { listMarketplaceTemplates } from "@/platform/schema-ui/marketplace/template-marketplace";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

type Snapshot = {
  id: string;
  version: number;
  label: string | null;
  publishedAt: Date;
};

type Props = {
  templateId: string | null;
  publishedVersion: number | null;
  snapshots: Snapshot[];
  onSchemaGenerated: (document: SchemaDocument) => void;
};

export function FormPublishingPanel({
  templateId,
  publishedVersion,
  snapshots,
  onSchemaGenerated,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marketplaceTemplates = listMarketplaceTemplates();

  const publish = async () => {
    if (!templateId) return;
    setBusy(true);
    setError(null);
    const res = await publishFormTemplateSnapshotAction(templateId, label || undefined);
    setBusy(false);
    if (!res.success) setError(res.error ?? "Publish failed");
    else window.location.reload();
  };

  const rollback = async (snapshotId: string) => {
    if (!templateId) return;
    setBusy(true);
    const res = await rollbackFormTemplateSnapshotAction(templateId, snapshotId);
    setBusy(false);
    if (!res.success) setError(res.error ?? "Rollback failed");
    else window.location.reload();
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    const res = await generateFormSchemaAction(prompt);
    setBusy(false);
    if (!res.success || !res.data?.document) {
      setError(!res.success ? res.error ?? "Generation failed" : "Generation failed");
      return;
    }
    onSchemaGenerated(res.data.document as SchemaDocument);
  };

  const installTemplate = async (marketplaceId: string) => {
    setBusy(true);
    setError(null);
    const res = await installMarketplaceTemplateAction(marketplaceId);
    setBusy(false);
    if (!res.success || !res.data?.document) {
      setError(!res.success ? res.error ?? "Install failed" : "Install failed");
      return;
    }
    onSchemaGenerated(res.data.document as SchemaDocument);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-sm">Template marketplace</h3>
        <p className="text-xs text-muted-foreground">Install a starter schema into the canvas.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {marketplaceTemplates.map((t) => (
            <div key={t.id} className="border rounded-md p-3 space-y-2">
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => installTemplate(t.id)}>
                Install
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-sm">AI schema generator</h3>
        <Label className="text-xs">Describe the form you want</Label>
        <Input
          placeholder='e.g. "Create an RFQ form for industrial cameras"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button type="button" size="sm" disabled={busy || !prompt.trim()} onClick={generate}>
          Generate schema
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-sm">Publish snapshot</h3>
        <p className="text-xs text-muted-foreground">
          Current published version: {publishedVersion ?? "none"}
        </p>
        <Label className="text-xs">Snapshot label (optional)</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Q3 launch" />
        <Button type="button" size="sm" disabled={busy || !templateId} onClick={publish}>
          Publish snapshot
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-medium text-sm">Version history</h3>
        {snapshots.length === 0 && (
          <p className="text-sm text-muted-foreground">No snapshots yet. Publish to create the first version.</p>
        )}
        {snapshots.map((s) => (
          <div key={s.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <div>
              <span className="font-medium">v{s.version}</span>
              {s.label ? ` — ${s.label}` : ""}
              <p className="text-xs text-muted-foreground">{s.publishedAt.toLocaleString()}</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => rollback(s.id)}>
              Rollback
            </Button>
          </div>
        ))}
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
