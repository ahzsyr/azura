"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormAbTest, FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { applySchemaPatch } from "@/features/forms/lib/ab-testing";
import { cloneDocument, documentToSchemaPatch } from "@/features/forms/lib/ab-patch";
import { SchemaRenderer } from "@/platform/schema-ui/layout/schema-renderer";
import { createSchemaRuntime } from "@/platform/schema-ui/runtime/schema-runtime";

type Props = {
  definition: FormTemplateDefinition;
  baseDocument: SchemaDocument;
  onChange: (definition: FormTemplateDefinition) => void;
  onVariantDocumentChange?: (variantDoc: SchemaDocument) => void;
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function FormAbTestingPanel({ definition, baseDocument, onChange }: Props) {
  const abTests = definition.abTests ?? [];
  const [showJson, setShowJson] = useState(false);
  const [editingVariant, setEditingVariant] = useState<"A" | "B">("A");

  const ensureTest = (): FormAbTest => {
    if (abTests[0]) return abTests[0]!;
    return {
      id: newId("ab"),
      name: "Primary experiment",
      enabled: false,
      variants: [
        { id: newId("var"), name: "Variant A", weight: 50 },
        { id: newId("var"), name: "Variant B", weight: 50, schemaPatch: documentToSchemaPatch(baseDocument) },
      ],
    };
  };

  const test = abTests[0] ?? ensureTest();
  const variantA = test.variants[0];
  const variantB = test.variants[1] ?? test.variants[0];

  const patchTests = (tests: FormAbTest[]) => onChange({ ...definition, abTests: tests });

  const updateTest = (patch: Partial<FormAbTest>) => {
    const next = { ...test, ...patch };
    patchTests(abTests.length === 0 ? [next] : abTests.map((t) => (t.id === test.id ? next : t)));
  };

  const updateVariant = (variantId: string, patch: Partial<FormAbTest["variants"][number]>) => {
    updateTest({
      variants: test.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v)),
    });
  };

  const duplicateAIntoB = () => {
    if (!variantB) return;
    updateVariant(variantB.id, { schemaPatch: documentToSchemaPatch(cloneDocument(baseDocument)) });
  };

  const docA = baseDocument;
  const docB = useMemo(() => {
    if (!variantB?.schemaPatch) return baseDocument;
    return applySchemaPatch(baseDocument, {
      nodes: variantB.schemaPatch.nodes as SchemaDocument["nodes"] | undefined,
      bindings: variantB.schemaPatch.bindings as SchemaDocument["bindings"] | undefined,
      steps: variantB.schemaPatch.steps as SchemaDocument["steps"] | undefined,
      rules: variantB.schemaPatch.rules as SchemaDocument["rules"] | undefined,
      theme: variantB.schemaPatch.theme as SchemaDocument["theme"] | undefined,
    });
  }, [baseDocument, variantB]);

  const previewDoc = editingVariant === "A" ? docA : docB;
  const runtime = useMemo(
    () => createSchemaRuntime({ document: previewDoc, schemaId: "ab-preview" }),
    [previewDoc],
  );

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-sm">A/B testing</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={test.enabled}
            onChange={(e) => updateTest({ enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      <div>
        <Label className="text-xs">Experiment name</Label>
        <Input className="mt-1" value={test.name} onChange={(e) => updateTest({ name: e.target.value })} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {test.variants.slice(0, 2).map((variant, i) => (
          <div key={variant.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{i === 0 ? "Variant A" : "Variant B"}</p>
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded border ${editingVariant === (i === 0 ? "A" : "B") ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setEditingVariant(i === 0 ? "A" : "B")}
              >
                Preview
              </button>
            </div>
            <Input
              value={variant.name}
              onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
            />
            <div>
              <Label className="text-xs">Weight %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={variant.weight}
                onChange={(e) => updateVariant(variant.id, { weight: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={duplicateAIntoB}>
          Duplicate A into B
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowJson((v) => !v)}>
          {showJson ? "Hide patch JSON" : "Inspect patch JSON"}
        </Button>
      </div>

      {showJson && variantB && (
        <textarea
          className="w-full min-h-[100px] rounded-md border px-2 py-1 text-xs font-mono"
          value={variantB.schemaPatch ? JSON.stringify(variantB.schemaPatch, null, 2) : ""}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              updateVariant(variantB.id, { schemaPatch: undefined });
              return;
            }
            try {
              updateVariant(variantB.id, { schemaPatch: JSON.parse(raw) });
            } catch {
              /* ignore while typing */
            }
          }}
        />
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Preview · {editingVariant === "A" ? "Variant A (base)" : "Variant B (patched)"}
        </p>
        <div className="border rounded-md p-3 bg-muted/20">
          <SchemaRenderer document={previewDoc} schemaId="ab-preview" runtime={runtime} />
        </div>
      </div>
    </Card>
  );
}
