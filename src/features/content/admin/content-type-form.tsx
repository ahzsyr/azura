"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ContentType } from "@prisma/client";
import type { ContentFieldDefinition } from "@/features/content/types";
import { upsertContentType, duplicateContentType } from "@/features/content/content-type.actions";
import {
  ContentTypeSchemaEditor,
  parseContentTypeJson,
} from "@/features/content/admin/content-type-schema-editor";
import { ContentTypeComparisonPanel } from "@/features/content/admin/content-type-comparison-panel";
import { ContentTypeImportExportPanel } from "@/features/content/admin/content-type-import-export-panel";
import { ContentTypeDeleteDialog } from "@/features/content/admin/content-type-delete-dialog";
import {
  mergeComparisonIntoAdminConfig,
  parseComparisonConfig,
} from "@/features/comparison/parse-comparison-config";
import type { ContentTypeComparisonConfig } from "@/features/comparison/types";
import {
  AdminFormProvider,
  AdminSettingsRibbon,
  type SettingsRibbonTab,
} from "@/components/admin/layout/admin-shell";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { useAdminActionToastStore } from "@/components/admin/layout/admin-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { type AdminLocalizedEntityView } from "@/features/translation/admin-localized-view";
import { isCustomContentTypeSlug } from "@/templates/preset-template-map";
import { contentTypeSettingsHref } from "@/features/content/content-admin-paths";
import { SLUG_INPUT_PATTERN } from "@/lib/slug-pattern";

export type ContentTypeBilingualView = AdminLocalizedEntityView<ContentType>;

type Props = {
  contentType?: ContentTypeBilingualView;
  isNew?: boolean;
};

const BASE_TABS: SettingsRibbonTab[] = [
  { id: "core", label: "Core" },
  { id: "display", label: "Display" },
  { id: "comparison", label: "Comparison" },
  { id: "fields", label: "Fields" },
];

const EDIT_TABS: SettingsRibbonTab[] = [
  ...BASE_TABS,
  { id: "import", label: "Import / export" },
];

function SettingsTabPanel({
  id,
  activeTab,
  children,
}: {
  id: string;
  activeTab: string;
  children: ReactNode;
}) {
  const isActive = id === activeTab;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
    >
      {children}
    </div>
  );
}

function normalizeSlugValue(value: string) {
  return value.trim().toLowerCase();
}

export function ContentTypeForm({ contentType, isNew }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markDirty = useCallback(() => markUnsaved(), [markUnsaved]);
  const tabs = isNew || !contentType ? BASE_TABS : EDIT_TABS;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "core");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

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

  const isPresetSlug = useMemo(
    () => Boolean(contentType?.slug && !isCustomContentTypeSlug(contentType.slug)),
    [contentType?.slug],
  );

  const handleSave = useCallback(async () => {
    const form = formRef.current;
    if (!form) return false;
    if (!form.reportValidity()) return false;

    const show = useAdminActionToastStore.getState().show;
    show("running", "Saving content type…");
    try {
      const result = await upsertContentType(new FormData(form));
      if (!result.ok) {
        show("error", result.error);
        return false;
      }
      show("success", "Content type saved");
      if (!contentType || result.id !== contentType.id) {
        router.push(contentTypeSettingsHref(result.id));
      }
      router.refresh();
      return true;
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Failed to save content type");
      return false;
    }
  }, [contentType, router]);

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
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
      className="space-y-6"
    >
      {contentType ? <input type="hidden" name="id" value={contentType.id} /> : null}
      <input type="hidden" name="fieldSchema" value={JSON.stringify(fieldSchema)} />
      <input type="hidden" name="displaySchema" value={displaySchemaJson} />
      <input type="hidden" name="adminConfig" value={adminConfigJson} />

      <AdminSettingsRibbon
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layoutId="content-type-settings-ribbon"
      />

      <SettingsTabPanel id="core" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Core settings</CardTitle>
            <CardDescription>Identity, labels, icon, and whether this type is enabled.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={contentType?.slug}
                required
                minLength={2}
                maxLength={64}
                pattern={SLUG_INPUT_PATTERN}
                autoComplete="off"
                spellCheck={false}
                onBlur={(e) => {
                  const next = normalizeSlugValue(e.currentTarget.value);
                  if (next !== e.currentTarget.value) e.currentTarget.value = next;
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. Used in admin URLs and templates.
              </p>
              {isPresetSlug ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  This is a preset type. Changing the slug can disconnect storefront templates,
                  and the original slug may be recreated automatically.
                </p>
              ) : null}
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

        {!isNew && contentType ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={duplicating}
              onClick={async () => {
                setDuplicating(true);
                const show = useAdminActionToastStore.getState().show;
                show("running", "Duplicating content type…");
                try {
                  const result = await duplicateContentType(contentType.id);
                  if (!result.ok) {
                    show("error", result.error);
                    return;
                  }
                  show("success", "Content type duplicated");
                  router.push(contentTypeSettingsHref(result.id));
                  router.refresh();
                } catch (error) {
                  show("error", error instanceof Error ? error.message : "Duplicate failed");
                } finally {
                  setDuplicating(false);
                }
              }}
            >
              {duplicating ? "Duplicating…" : "Duplicate"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        ) : null}
      </SettingsTabPanel>

      <SettingsTabPanel id="display" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Display settings</CardTitle>
            <CardDescription>How items of this type appear in cards on the live site.</CardDescription>
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
      </SettingsTabPanel>

      <SettingsTabPanel id="comparison" activeTab={activeTab}>
        <ContentTypeComparisonPanel
          fieldSchema={fieldSchema}
          comparison={comparison}
          onComparisonChange={updateComparison}
          onFieldSchemaChange={updateFieldSchema}
        />
      </SettingsTabPanel>

      <SettingsTabPanel id="fields" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Field schema</CardTitle>
            <CardDescription>Define custom fields, display JSON, and admin config for this type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentTypeSchemaEditor
              fieldSchema={fieldSchema}
              displaySchema={(() => {
                try {
                  const parsed = JSON.parse(displaySchemaJson || "{}") as unknown;
                  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                    ? (parsed as Record<string, unknown>)
                    : {};
                } catch {
                  return {};
                }
              })()}
              adminConfig={adminConfigBase}
              onFieldSchemaChange={updateFieldSchema}
              onDisplaySchemaChange={updateDisplaySchemaJson}
              onAdminConfigChange={updateAdminConfigBase}
            />
          </CardContent>
        </Card>
      </SettingsTabPanel>

      {!isNew && contentType ? (
        <SettingsTabPanel id="import" activeTab={activeTab}>
          <ContentTypeImportExportPanel typeId={contentType.id} typeSlug={contentType.slug} />
        </SettingsTabPanel>
      ) : null}
    </form>
    {!isNew && contentType ? (
      <ContentTypeDeleteDialog
        typeId={contentType.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          router.replace("/admin/content?tab=types");
          router.refresh();
        }}
      />
    ) : null}
    </AdminFormProvider>
  );
}
