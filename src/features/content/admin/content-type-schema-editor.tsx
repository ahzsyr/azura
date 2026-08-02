"use client";

import { useState } from "react";
import type { ContentType } from "@prisma/client";
import type { ContentFieldDefinition } from "@/features/content/types";
import { contentFieldDefinitionSchema } from "@/schemas/content/content-type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "boolean",
  "json",
  "price",
  "url",
  "date",
] as const;

type Props = {
  fieldSchema: ContentFieldDefinition[];
  displaySchema: Record<string, unknown>;
  adminConfig: Record<string, unknown>;
  onFieldSchemaChange: (fields: ContentFieldDefinition[]) => void;
  onDisplaySchemaChange: (json: string) => void;
  onAdminConfigChange: (json: string) => void;
};

function FieldRow({
  field,
  index,
  onChange,
  onRemove,
}: {
  field: ContentFieldDefinition;
  index: number;
  onChange: (index: number, field: ContentFieldDefinition) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-2 rounded-lg border p-3 items-start">
      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Key</Label>
          <Input
            value={field.key}
            onChange={(e) => onChange(index, { ...field, key: e.target.value })}
            placeholder="fieldKey"
          />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select
            className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm"
            value={field.type}
            onChange={(e) => onChange(index, { ...field, type: e.target.value as ContentFieldDefinition["type"] })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Label (EN)</Label>
          <Input
            value={field.labelEn}
            onChange={(e) => onChange(index, { ...field, labelEn: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Group</Label>
          <Input
            value={field.group ?? ""}
            onChange={(e) => onChange(index, { ...field, group: e.target.value || undefined })}
            placeholder="pricing, details, cta…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={field.localized ?? false}
            onChange={(e) => onChange(index, { ...field, localized: e.target.checked })}
          />
          Localized (En/Ar fields)
        </label>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ContentTypeSchemaEditor({
  fieldSchema,
  displaySchema,
  adminConfig,
  onFieldSchemaChange,
  onDisplaySchemaChange,
  onAdminConfigChange,
}: Props) {
  const [jsonFields, setJsonFields] = useState(JSON.stringify(fieldSchema, null, 2));
  const [jsonDisplay, setJsonDisplay] = useState(JSON.stringify(displaySchema, null, 2));
  const [jsonAdmin, setJsonAdmin] = useState(JSON.stringify(adminConfig, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const addField = () => {
    onFieldSchemaChange([
      ...fieldSchema,
      { key: `field${fieldSchema.length + 1}`, type: "text", labelEn: "New field", group: "general" },
    ]);
  };

  const updateField = (index: number, field: ContentFieldDefinition) => {
    const next = [...fieldSchema];
    next[index] = field;
    onFieldSchemaChange(next);
  };

  const removeField = (index: number) => {
    onFieldSchemaChange(fieldSchema.filter((_, i) => i !== index));
  };

  const applyJsonFields = () => {
    try {
      const parsed = JSON.parse(jsonFields);
      const validated = parsed.map((f: unknown) => contentFieldDefinitionSchema.parse(f));
      onFieldSchemaChange(validated);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <Tabs defaultValue="visual">
      <TabsList>
        <TabsTrigger value="visual">Field builder</TabsTrigger>
        <TabsTrigger value="json">JSON editor</TabsTrigger>
      </TabsList>

      <TabsContent value="visual" className="space-y-4 mt-4">
        <div className="space-y-2">
          {fieldSchema.map((field, i) => (
            <FieldRow key={`${field.key}-${i}`} field={field} index={i} onChange={updateField} onRemove={removeField} />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" /> Add field
        </Button>
        {fieldSchema.length > 0 ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Search index preview</p>
            <p>
              Searchable:{" "}
              {fieldSchema
                .filter((f) => {
                  if (f.search === false) return false;
                  if (f.search === true || (typeof f.search === "object" && f.search)) return true;
                  return f.type === "text" || f.type === "textarea" || f.type === "url";
                })
                .map((f) => f.key)
                .join(", ") || "—"}
            </p>
            <p className="mt-1">
              Facets:{" "}
              {fieldSchema
                .filter(
                  (f) =>
                    f.search === true ||
                    (typeof f.search === "object" && f.search?.facet) ||
                    f.type === "select" ||
                    f.type === "boolean" ||
                    f.type === "number" ||
                    f.type === "date",
                )
                .map((f) => f.key)
                .join(", ") || "—"}
            </p>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="json" className="space-y-4 mt-4">
        <div>
          <Label>fieldSchema</Label>
          <Textarea
            rows={12}
            value={jsonFields}
            onChange={(e) => setJsonFields(e.target.value)}
            className="font-mono text-xs"
          />
          <Button type="button" size="sm" className="mt-2" onClick={applyJsonFields}>
            Apply & validate
          </Button>
          {jsonError ? <p className="text-sm text-destructive mt-1">{jsonError}</p> : null}
        </div>
        <div>
          <Label>displaySchema</Label>
          <Textarea
            rows={6}
            value={jsonDisplay}
            onChange={(e) => {
              setJsonDisplay(e.target.value);
              onDisplaySchemaChange(e.target.value);
            }}
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Label>adminConfig</Label>
          <Textarea
            rows={6}
            value={jsonAdmin}
            onChange={(e) => {
              setJsonAdmin(e.target.value);
              onAdminConfigChange(e.target.value);
            }}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            e.g. {`{"inquiryEnabled": true, "displayDefaults": {"showPrice": true}}`}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function serializeSchemasForForm(
  fieldSchema: ContentFieldDefinition[],
  displaySchema: Record<string, unknown>,
  adminConfig: Record<string, unknown>
) {
  return {
    fieldSchemaJson: JSON.stringify(fieldSchema),
    displaySchemaJson: JSON.stringify(displaySchema),
    adminConfigJson: JSON.stringify(adminConfig),
  };
}

export function parseContentTypeJson(type: ContentType) {
  return {
    fieldSchema: (Array.isArray(type.fieldSchema) ? type.fieldSchema : []) as ContentFieldDefinition[],
    displaySchema: (type.displaySchema ?? {}) as Record<string, unknown>,
    adminConfig: (type.adminConfig ?? {}) as Record<string, unknown>,
  };
}
