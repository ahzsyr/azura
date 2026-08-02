"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateFormSchemaAction } from "@/features/forms/actions";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { mergeSchemaDocuments } from "@/features/forms/lib/merge-schema-documents";

export { mergeSchemaDocuments } from "@/features/forms/lib/merge-schema-documents";

const MICRO_ACTIONS = [
  {
    id: "suggest-field",
    label: "Suggest next field",
    prompt: "Suggest one additional useful field for this form and return a complete improved schema.",
  },
  {
    id: "improve-labels",
    label: "Improve labels",
    prompt: "Improve field labels for clarity and conversion. Keep the same fields.",
  },
  {
    id: "make-shorter",
    label: "Make shorter",
    prompt: "Simplify this form: fewer fields, clearer labels, higher conversion.",
  },
  {
    id: "improve-conversion",
    label: "Improve conversion",
    prompt: "Optimize this lead form for conversion with better field order and labels.",
  },
  {
    id: "gdpr",
    label: "Add GDPR checkbox",
    prompt: "Add a required GDPR/privacy consent checkbox to this form.",
  },
  {
    id: "phone-validation",
    label: "Add phone validation",
    prompt: "Ensure there is a phone field with validation and clear label.",
  },
] as const;

type Props = {
  document: SchemaDocument;
  onMergeDocument: (document: SchemaDocument) => void;
};

export function MicroAiPanel({ document, onMergeDocument }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (prompt: string) => {
    setBusy(true);
    setError(null);
    const res = await generateFormSchemaAction(
      `${prompt}\n\nCurrent bindings: ${document.bindings.map((b) => b.presentation.label ?? b.bindingId).join(", ")}`,
    );
    setBusy(false);
    if (!res.success || !res.data?.document) {
      setError(res.success ? "Generation failed" : res.error ?? "Generation failed");
      return;
    }
    onMergeDocument(mergeSchemaDocuments(document, res.data.document as SchemaDocument));
  };

  return (
    <Card className="p-3 space-y-2">
      <h3 className="font-medium text-sm">AI suggestions</h3>
      <div className="flex flex-wrap gap-1">
        {MICRO_ACTIONS.map((a) => (
          <Button
            key={a.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(a.prompt)}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {busy && <p className="text-xs text-muted-foreground">Working…</p>}
    </Card>
  );
}
