"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { ContentType } from "@prisma/client";
import type { ContentFieldDefinition } from "@/features/content/types";
import { upsertContentType, deleteContentType } from "@/features/content/content-type.actions";
import {
  ContentTypeSchemaEditor,
  parseContentTypeJson,
} from "@/features/content/admin/content-type-schema-editor";
import { ContentTypeComparisonPanel } from "@/features/content/admin/content-type-comparison-panel";
import {
  mergeComparisonIntoAdminConfig,
  parseComparisonConfig,
} from "@/features/comparison/parse-comparison-config";
import type { ContentTypeComparisonConfig } from "@/features/comparison/types";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { ContentAdminTabs } from "@/features/content/admin/content-admin-tabs";
import {
  readAdminDefaultLocaleField,
  type AdminLocalizedEntityView,
} from "@/features/translation/admin-localized-view";
import { isCustomContentTypeSlug } from "@/templates/preset-template-map";
import { Badge } from "@/components/ui/badge";

export type ContentTypeBilingualView = AdminLocalizedEntityView<ContentType>;

type Props = {
  contentType?: ContentTypeBilingualView;
  isNew?: boolean;
};

export function ContentTypeForm({ contentType, isNew }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markDirty = useCallback(() => markUnsaved(), [markUnsaved]);

  const initial = contentType ? parseContentTypeJson(contentType) : {
    fieldSchema: [] as ContentFieldDefinition[],
    displaySchema: {},
    adminConfig: { inquiryEnabled: true },
  };

  const [fieldSchema, setFieldSchema] = useState(initial.fieldSchema);
  const [displaySchemaJson, setDisplaySchemaJson] = useState(JSON.stringify(initial.displaySchema, null, 2));
  const [adminConfigBase, setAdminConfigBase] = useState(initial.adminConfig);

  // Card cover image aspect ratio — stored in adminConfig.adminListImageAspect
  const [imageAspect, setImageAspect] = useState<string>(
    () => (initial.adminConfig.adminListImageAspect as string) ?? "16:9",
  );
  const [comparison, setComparison] = useState<ContentTypeComparisonConfig>(
    () => parseComparisonConfig(initial.adminConfig)
  );
  const adminConfigJson = JSON.stringify(
    { ...mergeComparisonIntoAdminConfig(adminConfigBase, comparison), adminListImageAspect: imageAspect },
    null,
    2
  );

  const handleSave = useCallback(async () => {
    formRef.current?.requestSubmit();
  }, []);

  const updateFieldSchema = useCallback(
    (next: ContentFieldDefinition[]) => {
      markDirty();
      setFieldSchema(next);
    },
    [markDirty],
  );

  const updateDisplaySchemaJson = useCallback(
    (next: string) => {
      markDirty();
      setDisplaySchemaJson(next);
    },
    [markDirty],
  );

  const updateComparison = useCallback(
    (next: ContentTypeComparisonConfig) => {
      markDirty();
      setComparison(next);
    },
    [markDirty],
  );

  const updateAdminConfigBase = useCallback(
    (json: string) => {
      markDirty();
      try {
        const parsed = JSON.parse(json || "{}") as Record<string, unknown>;
        setAdminConfigBase(parsed);
        setComparison(parseComparisonConfig(parsed));
      } catch {
        setAdminConfigBase({});
      }
    },
    [markDirty],
  );

  return (
    <AdminFormProvider onSave={handleSave} trackFormId="content-type-form">
    <form
      id="content-type-form"
      ref={formRef}
      action={upsertContentType}
      className="space-y-8"
    >
      {contentType ? <input type="hidden" name="id" value={contentType.id} /> : null}
      <input type="hidden" name="fieldSchema" value={JSON.stringify(fieldSchema)} />
      <input type="hidden" name="displaySchema" value={displaySchemaJson} />
      <input type="hidden" name="adminConfig" value={adminConfigJson} />

      <Card>
        <CardHeader>
          <CardTitle>Core settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={contentType?.slug}
              required
              readOnly={!isNew}
              aria-readonly={!isNew}
              className={!isNew ? "bg-muted" : undefined}
            />
          </div>
          <div>
            <Label htmlFor="routePrefix">Route prefix</Label>
            <Input
              id="routePrefix"
              name="routePrefix"
              defaultValue={contentType?.routePrefix ?? ""}
              placeholder="e.g. catalog-items"
            />
          </div>
          <div className="sm:col-span-2">
          <AdminLocalizedFormField
            fieldKey="name"
            label="Name"
            entityType="ContentType"
            entityId={contentType?.id}
            legacyEntity={contentType}
            required
          />
          </div>
          <div className="sm:col-span-2">
          <AdminLocalizedFormField
            fieldKey="labelSingular"
            label="Singular label"
            entityType="ContentType"
            entityId={contentType?.id}
            legacyEntity={
              contentType ?? {
                labelSingularEn: "Item",
                labelSingularAr: "عنصر",
              }
            }
            required
          />
          </div>
          <div className="sm:col-span-2">
          <AdminLocalizedFormField
            fieldKey="labelPlural"
            label="Plural label"
            entityType="ContentType"
            entityId={contentType?.id}
            legacyEntity={
              contentType ?? {
                labelPluralEn: "Items",
                labelPluralAr: "عناصر",
              }
            }
            required
          />
          </div>
          <div>
            <Label htmlFor="icon">Icon</Label>
            <Input id="icon" name="icon" defaultValue={contentType?.icon ?? "box"} />
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input id="sortOrder" name="sortOrder" type="number" defaultValue={contentType?.sortOrder ?? 0} />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="hidden" name="isEnabled" value="false" />
            <input
              type="checkbox"
              name="isEnabled"
              value="true"
              defaultChecked={contentType?.isEnabled ?? true}
            />
            Enabled
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="imageAspect">Card cover image ratio</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Controls the image aspect ratio for cards displayed on the live website (e.g. in catalog blocks).
            </p>
            <select
              id="imageAspect"
              value={imageAspect}
              onChange={(e) => {
                setImageAspect(e.target.value);
                markDirty();
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="16:9">16:9 - Widescreen</option>
              <option value="4:3">4:3 - Standard</option>
              <option value="1:1">1:1 - Square</option>
              <option value="3:4">3:4 - Portrait</option>
              <option value="auto">Auto - Natural image size</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparison settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentTypeComparisonPanel
            fieldSchema={fieldSchema}
            comparison={comparison}
            onComparisonChange={updateComparison}
            onFieldSchemaChange={updateFieldSchema}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field schema</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentTypeSchemaEditor
            fieldSchema={fieldSchema}
            displaySchema={JSON.parse(displaySchemaJson || "{}")}
            adminConfig={adminConfigBase}
            onFieldSchemaChange={updateFieldSchema}
            onDisplaySchemaChange={updateDisplaySchemaJson}
            onAdminConfigChange={updateAdminConfigBase}
          />
        </CardContent>
      </Card>

      {!isNew && contentType ? (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this content type? Only allowed when no items exist.")) {
                deleteContentType(contentType.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </form>
    </AdminFormProvider>
  );
}

export function ContentTypesListPage({
  types,
}: {
  types: (ContentTypeBilingualView & { _count: { items: number } })[];
}) {
  return (
    <div className="space-y-6">
      <ContentAdminTabs />
      <AdminPageHeader
        title="Content Types"
        description="Define entity types, field schemas, and public route prefixes. Field schemas drive generic public templates and search."
        actions={
          <Button asChild>
            <Link href="/admin/content/types/new">Create entity type</Link>
          </Button>
        }
      />

      <div className="space-y-3">
        {types.map((type) => (
          <div key={type.id} className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                {readAdminDefaultLocaleField(type, "labelPlural", type.displayTitle)}
                <Badge variant={isCustomContentTypeSlug(type.slug) ? "secondary" : "outline"}>
                  {isCustomContentTypeSlug(type.slug) ? "Custom" : "Preset"}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                {type.slug}
                {type.routePrefix ? ` · /${type.routePrefix}` : ""}
                · {type._count.items} items
                {!type.isEnabled ? " · disabled" : ""}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/content/types/${type.id}`}>Edit</Link>
            </Button>
          </div>
        ))}
        {types.length === 0 ? (
          <p className="text-sm text-muted-foreground">No content types yet.</p>
        ) : null}
      </div>
    </div>
  );
}
