"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { FormTemplateCategory } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { saveFormTemplateAction } from "@/features/forms/actions";
import {
  formFieldTypeSchema,
  newFormFieldId,
  type formTemplateDefinitionSchema,
} from "@/features/forms/schemas/form-definition";
import type { z } from "zod";

type FormDefinition = z.infer<typeof formTemplateDefinitionSchema>;

type TemplateInput = {
  id: string | null;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string;
  isPublished: boolean;
  definition: FormDefinition;
};

const FIELD_TYPES = formFieldTypeSchema.options;

function SortableField({
  field,
  index,
  onChange,
  onRemove,
}: {
  field: FormDefinition["fields"][number];
  index: number;
  onChange: (index: number, patch: Partial<FormDefinition["fields"][number]>) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card ref={setNodeRef} style={style} className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground">Field {index + 1}</span>
        <Button type="button" variant="ghost" size="sm" className="ms-auto" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={field.type}
            onChange={(e) => onChange(index, { type: e.target.value as typeof field.type })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 text-sm pb-1">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange(index, { required: e.target.checked })}
          />
          Required
        </label>
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onChange(index, { label: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  );
}

export function FormDesignerPage({ initial }: { initial: TemplateInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [savedForm, setSavedForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateField = useCallback(
    (index: number, patch: Partial<FormDefinition["fields"][number]>) => {
      patchForm((prev) => {
        const fields = [...prev.definition.fields];
        fields[index] = { ...fields[index], ...patch };
        return { ...prev, definition: { ...prev.definition, fields } };
      });
    },
    [patchForm],
  );

  const removeField = useCallback(
    (index: number) => {
      patchForm((prev) => {
        const fields = prev.definition.fields.filter((_, i) => i !== index);
        return { ...prev, definition: { ...prev.definition, fields } };
      });
    },
    [patchForm],
  );

  const addField = () => {
    patchForm((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        fields: [
          ...prev.definition.fields,
          {
            id: newFormFieldId(),
            type: "text",
            label: "New field",
            required: false,
          },
        ],
      },
    }));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    patchForm((prev) => {
      const fields = [...prev.definition.fields];
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      return {
        ...prev,
        definition: { ...prev.definition, fields: arrayMove(fields, oldIndex, newIndex) },
      };
    });
  };

  const persistForm = useCallback(
    async (nextForm: TemplateInput) => {
      setError(null);
      setSaveStatus("saving");
      const res = await saveFormTemplateAction(nextForm.id, {
        name: nextForm.name,
        slug: nextForm.slug,
        category: nextForm.category,
        description: nextForm.description,
        definitionJson: JSON.stringify(nextForm.definition),
        isPublished: nextForm.isPublished,
      });
      if (!res.success) {
        setError(res.error ?? "Save failed");
        setSaveStatus("error");
        return false;
      }
      const persisted = { ...nextForm, id: nextForm.id ?? res.data?.id ?? null };
      setSavedForm(persisted);
      setForm(persisted);
      markSaved();
      if (!nextForm.id && res.data?.id) {
        router.replace(`/admin/forms/${res.data.id}`);
      } else {
        router.refresh();
      }
      return true;
    },
    [markSaved, router, setSaveStatus],
  );

  const handleSave = useCallback(async () => {
    return persistForm(form);
  }, [form, persistForm]);

  const handlePublish = useCallback(async () => {
    return persistForm({ ...form, isPublished: true });
  }, [form, persistForm]);

  const handleCancel = useCallback(() => {
    setForm(savedForm);
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

  const adminEmails = form.definition.notifications?.adminEmails?.join(", ") ?? "";

  return (
    <>
      <AdminPageHeader
        title={form.id ? `Edit: ${form.name}` : "New form template"}
        description="Drag fields to reorder. Configure notifications and webhooks below."
      />

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => patchForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => patchForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="w-full border rounded-md h-10 px-2 text-sm"
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
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm pt-6">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    patchForm((prev) => ({ ...prev, isPublished: e.target.checked }))
                  }
                />
                Published
              </label>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  patchForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="font-medium">Fields</h3>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4 me-1" /> Add field
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={form.definition.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {form.definition.fields.map((field, index) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    index={index}
                    onChange={updateField}
                    onRemove={removeField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Notifications</h3>
            <div>
              <Label className="text-xs">Admin emails (comma-separated)</Label>
              <Input
                className="mt-1"
                value={adminEmails}
                onChange={(e) =>
                  patchForm((prev) => ({
                    ...prev,
                    definition: {
                      ...prev.definition,
                      notifications: {
                        adminEmails: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        sendToSubmitter: prev.definition.notifications?.sendToSubmitter ?? false,
                      },
                    },
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.definition.notifications?.sendToSubmitter ?? false}
                onChange={(e) =>
                  patchForm((prev) => ({
                    ...prev,
                    definition: {
                      ...prev.definition,
                      notifications: {
                        adminEmails: prev.definition.notifications?.adminEmails ?? [],
                        sendToSubmitter: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Send auto-reply to submitter
            </label>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Webhook (CRM)</h3>
            <Input
              placeholder="https://hooks.example.com/..."
              value={form.definition.webhooks?.[0]?.url ?? ""}
              onChange={(e) =>
                patchForm((prev) => ({
                  ...prev,
                  definition: {
                    ...prev.definition,
                    webhooks: e.target.value
                      ? [{ url: e.target.value, events: ["submit"] as const }]
                      : [],
                  },
                }))
              }
            />
          </Card>

          {form.category === "MULTI_STEP" && (
            <Card className="p-4 space-y-2">
              <h3 className="font-medium text-sm">Steps</h3>
              <p className="text-xs text-muted-foreground">
                Steps are auto-generated from field order (2 fields per step) on save if not configured.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
