"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { FormTemplateCategory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveFormTemplateAction, publishFormTemplateSnapshotAction } from "@/features/forms/actions";
import type { formTemplateDefinitionSchema } from "@/features/forms/schemas/form-definition";
import {
  serializeDocumentEnvelope,
  wrapDocumentEnvelope,
  type DesignerComment,
  type DocumentEnvelopeMeta,
  type DocumentExtensions,
} from "@/features/forms/lib/document-envelope";
import { hasBlockingHealthIssues } from "@/features/forms/lib/form-health";
import { computeFormHealthReport } from "@/features/forms/lib/form-health-score";
import { SchemaDesignerShell } from "@/platform/schema-ui/designer/schema-designer-shell";
import { SchemaUiProvider } from "@/platform/schema-ui/provider/schema-ui-provider";
import { FormAbTestingPanel } from "@/features/forms/admin/form-ab-testing-panel";
import { FormPublishingPanel } from "@/features/forms/admin/form-publishing-panel";
import { FormLogicPanel } from "@/features/forms/admin/form-logic-panel";
import { AutomationFlowPanel } from "@/features/forms/admin/automation-flow-panel";
import { FormHealthScorePanel } from "@/features/forms/admin/form-health-score-panel";
import { MicroAiPanel } from "@/features/forms/admin/micro-ai-panel";
import { ReusableBlocksPanel } from "@/features/forms/admin/reusable-blocks-panel";
import { DesignerCommentsPanel } from "@/features/forms/admin/designer-comments-panel";
import { TranslationManagerPanel } from "@/features/forms/admin/translation-manager-panel";
import { insertReusableBlock } from "@/features/forms/blocks/reusable-blocks";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { z } from "zod";

type FormDefinition = z.infer<typeof formTemplateDefinitionSchema>;

type Assignee = { id: string; name: string; email: string };
type Snapshot = { id: string; version: number; label: string | null; publishedAt: Date };

type TemplateInput = {
  id: string | null;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string;
  isPublished: boolean;
  publishedVersion?: number | null;
  definition: FormDefinition;
  schemaDocument: SchemaDocument;
  extensions: DocumentExtensions;
  meta?: DocumentEnvelopeMeta;
};

export function FormDesignerPage({
  initial,
  snapshots = [],
  assignees = [],
}: {
  initial: TemplateInput;
  snapshots?: Snapshot[];
  assignees?: Assignee[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [savedForm, setSavedForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [schemaDocument, setSchemaDocument] = useState<SchemaDocument>(initial.schemaDocument);
  const [publishBusy, setPublishBusy] = useState(false);
  const [previewLocale, setPreviewLocale] = useState("en");
  const [comments, setComments] = useState<DesignerComment[]>(
    initial.meta?.designerComments ?? [],
  );
  const [selectBindingId, setSelectBindingId] = useState<string | null>(null);

  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const patchForm = useCallback(
    (updater: (prev: TemplateInput) => TemplateInput) => {
      markUnsaved();
      setForm((prev) => updater(prev));
    },
    [markUnsaved],
  );

  const extensionsFromForm = useCallback(
    (nextForm: TemplateInput): DocumentExtensions => ({
      notifications: nextForm.definition.notifications,
      webhooks: nextForm.definition.webhooks,
      scoringRules: nextForm.definition.scoringRules,
      pipeline: nextForm.definition.pipeline,
      routingRules: nextForm.definition.routingRules,
      destinations: nextForm.definition.destinations,
      automationRules: nextForm.definition.automationRules,
      allowedAdminIds: nextForm.definition.allowedAdminIds,
      abTests: nextForm.definition.abTests,
    }),
    [],
  );

  const healthReport = useMemo(
    () => computeFormHealthReport(schemaDocument, extensionsFromForm(form)),
    [schemaDocument, form, extensionsFromForm],
  );

  const persistForm = useCallback(
    async (nextForm: TemplateInput, nextSchema: SchemaDocument) => {
      setError(null);
      setSaveStatus("saving");
      const extensions = extensionsFromForm(nextForm);
      const meta: DocumentEnvelopeMeta = { designerComments: comments };
      const definitionJson = JSON.stringify(
        serializeDocumentEnvelope(wrapDocumentEnvelope(nextSchema, extensions, meta)),
      );
      const res = await saveFormTemplateAction(nextForm.id, {
        name: nextForm.name,
        slug: nextForm.slug,
        category: nextForm.category,
        description: nextForm.description,
        definitionJson,
        isPublished: nextForm.isPublished,
      });
      if (!res.success) {
        setError(res.error ?? "Save failed");
        setSaveStatus("error");
        return false;
      }
      const persisted = {
        ...nextForm,
        id: nextForm.id ?? res.data?.id ?? null,
        schemaDocument: nextSchema,
        extensions,
        meta,
      };
      setSavedForm(persisted);
      setForm(persisted);
      setSchemaDocument(nextSchema);
      markSaved();
      if (!nextForm.id && res.data?.id) {
        router.replace(`/admin/forms/${res.data.id}`);
      } else {
        router.refresh();
      }
      return true;
    },
    [markSaved, router, setSaveStatus, extensionsFromForm, comments],
  );

  const handleSave = useCallback(async () => {
    return persistForm(form, schemaDocument);
  }, [form, schemaDocument, persistForm]);

  const handlePublish = useCallback(async () => {
    return persistForm({ ...form, isPublished: true }, schemaDocument);
  }, [form, schemaDocument, persistForm]);

  const handleCancel = useCallback(() => {
    setForm(savedForm);
    setSchemaDocument(savedForm.schemaDocument);
    setComments(savedForm.meta?.designerComments ?? []);
    setError(null);
  }, [savedForm]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onPublish: handlePublish,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handlePublish, handleCancel]);

  const overviewTab = useMemo(
    () => (
      <div className="mx-auto max-w-4xl space-y-6">
        <FormHealthScorePanel
          report={healthReport}
          onIssueClick={(id) => {
            setSelectBindingId(id ?? null);
          }}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 rounded-xl border p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold">Form settings</h3>
              <p className="text-xs text-muted-foreground">Name, slug, and category for this template.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => patchForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  className="mt-1"
                  value={form.slug}
                  onChange={(e) => patchForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="mt-1 w-full rounded-md border h-10 px-2 text-sm"
                  value={form.category}
                  onChange={(e) =>
                    patchForm((prev) => ({
                      ...prev,
                      category: e.target.value as FormTemplateCategory,
                    }))
                  }
                >
                  <option value="LEAD">Lead</option>
                  <option value="CONTACT">Contact</option>
                  <option value="MULTI_STEP">Multi-step</option>
                  <option value="GENERAL">General</option>
                  <option value="SURVEY">Survey</option>
                </select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Badge variant={form.isPublished ? "default" : "secondary"}>
                  {form.isPublished ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">Health {healthReport.overall}</Badge>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => patchForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </Card>
          <Card className="space-y-3 rounded-xl border p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold">Template details</h3>
              <p className="text-xs text-muted-foreground">Current document composition.</p>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border bg-muted/30 px-2 py-3">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Fields</dt>
                <dd className="text-lg font-semibold">{schemaDocument.bindings.length}</dd>
              </div>
              <div className="rounded-xl border bg-muted/30 px-2 py-3">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Steps</dt>
                <dd className="text-lg font-semibold">{schemaDocument.steps?.length ?? 0}</dd>
              </div>
              <div className="rounded-xl border bg-muted/30 px-2 py-3">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Rules</dt>
                <dd className="text-lg font-semibold">{schemaDocument.rules?.length ?? 0}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    ),
    [form, schemaDocument, patchForm, healthReport],
  );

  const automationTab = useMemo(
    () => (
      <AutomationFlowPanel
        definition={form.definition}
        assignees={assignees}
        templateName={form.name}
        onChange={(definition) => patchForm((prev) => ({ ...prev, definition }))}
      />
    ),
    [form.definition, form.name, assignees, patchForm],
  );

  const analyticsTab = useMemo(
    () => (
      <div className="space-y-4">
        <Card className="p-4 space-y-2">
          <h3 className="font-medium text-sm">Analytics</h3>
          {form.id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/forms/analytics?templateId=${form.id}`}>Open analytics & field performance</Link>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Save the form first to view analytics.</p>
          )}
        </Card>
        <FormAbTestingPanel
          definition={form.definition}
          baseDocument={schemaDocument}
          onChange={(definition) => patchForm((prev) => ({ ...prev, definition }))}
        />
      </div>
    ),
    [form.id, form.definition, schemaDocument, patchForm],
  );

  const publishSnapshot = async () => {
    if (!form.id) return;
    if (hasBlockingHealthIssues(healthReport.issues)) {
      setError("Fix blocking validation issues before publishing.");
      return;
    }
    setPublishBusy(true);
    const saved = await persistForm({ ...form, isPublished: true }, schemaDocument);
    if (!saved) {
      setPublishBusy(false);
      return;
    }
    const res = await publishFormTemplateSnapshotAction(form.id);
    setPublishBusy(false);
    if (!res.success) setError(res.error ?? "Publish failed");
    else router.refresh();
  };

  const publishTab = useMemo(
    () => (
      <div className="space-y-4">
        <FormHealthScorePanel report={healthReport} onIssueClick={(id) => setSelectBindingId(id ?? null)} />
        <Card className="p-4 space-y-3">
          <h3 className="font-medium text-sm">Publish flow</h3>
          <Button type="button" onClick={publishSnapshot} disabled={!form.id || publishBusy}>
            {publishBusy ? "Publishing…" : "Validate & publish snapshot"}
          </Button>
        </Card>
        <TranslationManagerPanel
          templateId={form.id}
          definition={form.definition}
          previewLocale={previewLocale}
          onPreviewLocaleChange={setPreviewLocale}
          onFieldLegacyChange={(index, patch) => {
            patchForm((prev) => {
              const fields = [...(prev.definition.fields ?? [])];
              const current = fields[index];
              if (!current) return prev;
              if (
                patch.label !== undefined &&
                patch.label === current.label &&
                Object.keys(patch).every((k) => k === "label" || (patch as Record<string, unknown>)[k] === (current as Record<string, unknown>)[k])
              ) {
                return prev;
              }
              fields[index] = { ...current, ...patch };
              return { ...prev, definition: { ...prev.definition, fields } };
            });
          }}
        />
        <FormPublishingPanel
          templateId={form.id}
          publishedVersion={form.publishedVersion ?? null}
          snapshots={snapshots}
          onSchemaGenerated={(document) => {
            markUnsaved();
            setSchemaDocument(document);
          }}
        />
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, snapshots, healthReport, publishBusy, markUnsaved, previewLocale, patchForm],
  );

  const healthBanner =
    healthReport.issues.length > 0 ? (
      <div className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          Health {healthReport.overall} · {healthReport.overallLabel} · {healthReport.issues.length} issues
        </p>
        {healthReport.issues.slice(0, 3).map((issue) => (
          <button
            key={issue.id}
            type="button"
            className="block text-left text-amber-800 dark:text-amber-300 hover:underline"
            onClick={() => setSelectBindingId(issue.bindingId ?? null)}
          >
            ⚠ {issue.message}
          </button>
        ))}
      </div>
    ) : null;

  const builderBlocks = (
    <ReusableBlocksPanel
      onInsert={(id) => {
        markUnsaved();
        setSchemaDocument((doc) => insertReusableBlock(doc, id));
      }}
    />
  );

  const builderAssets = (
    <div className="space-y-3">
      <MicroAiPanel
        document={schemaDocument}
        onMergeDocument={(doc) => {
          markUnsaved();
          setSchemaDocument(doc);
        }}
      />
      <DesignerCommentsPanel
        comments={comments}
        selectionId={selectBindingId}
        onChange={(next) => {
          markUnsaved();
          setComments(next);
        }}
      />
      <FormHealthScorePanel report={healthReport} onIssueClick={(id) => setSelectBindingId(id ?? null)} />
    </div>
  );

  return (
    <SchemaUiProvider>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <SchemaDesignerShell
        title={form.id ? `Edit: ${form.name}` : "New form template"}
        description={
          form.category === "SURVEY"
            ? "Survey designer — rating, NPS, Likert, and feedback fields."
            : "Visual form builder. Runtime definition is compiled on save."
        }
        initialDocument={schemaDocument}
        healthBanner={healthBanner}
        builderBlocks={builderBlocks}
        builderAssets={builderAssets}
        previewLocale={previewLocale}
        externalSelection={selectBindingId ? { type: "binding", id: selectBindingId } : null}
        onSave={async (document) => {
          markUnsaved();
          setSchemaDocument(document);
          return persistForm(form, document);
        }}
        onDocumentChange={(document) => {
          markUnsaved();
          setSchemaDocument(document);
        }}
        onSelectionChange={(sel) => {
          if (sel?.type === "binding") setSelectBindingId(sel.id);
        }}
        renderLogicPanel={({ document, onChange }) => (
          <FormLogicPanel
            document={document}
            scoringRules={form.definition.scoringRules ?? []}
            onDocumentChange={onChange}
            onScoringChange={(scoringRules) =>
              patchForm((prev) => ({
                ...prev,
                definition: { ...prev.definition, scoringRules },
              }))
            }
          />
        )}
        extraTabs={{
          overview: overviewTab,
          automation: automationTab,
          analytics: analyticsTab,
          publish: publishTab,
        }}
      />
    </SchemaUiProvider>
  );
}
