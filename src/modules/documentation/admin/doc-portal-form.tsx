"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { DocPortal, DocSection, DocVersion } from "@prisma/client";
import { upsertDocPortal } from "@/modules/documentation/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { NestedLocalizedRowInput } from "@/features/translation/components/nested-localized-row-field";
import type { DocPortalFormDrafts } from "./doc-portal-form-data";

type PortalWithChildren = DocPortal & {
  versions: DocVersion[];
  sections: DocSection[];
};

const EMPTY_VERSION = {
  slug: "",
  isDefault: false,
};

const EMPTY_SECTION = {
  versionId: "",
  parentId: "",
  slug: "",
  href: "",
};

export function DocPortalForm({
  portal,
  formDrafts,
  mode = portal ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  portal?: PortalWithChildren | null;
  formDrafts?: DocPortalFormDrafts;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [versions, setVersions] = useState<Record<string, unknown>[]>(formDrafts?.versions ?? []);
  const [sections, setSections] = useState<Record<string, unknown>[]>(formDrafts?.sections ?? []);

  useEffect(() => {
    if (formDrafts) {
      setVersions(formDrafts.versions);
      setSections(formDrafts.sections);
    }
  }, [formDrafts]);

  useEffect(() => {
    if (!embedded || !formRef?.current || !adminForm) return;
    const form = formRef.current;
    const markDirty = () => adminForm.setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [embedded, formRef, adminForm]);

  const handleSubmit = (formData: FormData) => {
    formData.set("versionsJson", JSON.stringify(versions));
    formData.set("sectionsJson", JSON.stringify(sections));
    startTransition(async () => {
      const saved = await upsertDocPortal(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/documentation/${saved.id}`);
      else {
        adminForm?.showToast("Doc portal saved", "success");
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      {portal && <input type="hidden" name="id" value={portal.id} />}
      <input type="hidden" name="sortOrder" value={portal?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        entityType="DocPortal"
        entityId={portal?.id}
        legacyEntity={formDrafts?.portalLegacy ?? portal ?? undefined}
        required
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        entityType="DocPortal"
        entityId={portal?.id}
        legacyEntity={formDrafts?.portalLegacy ?? portal ?? undefined}
        multiline
        rows={3}
      />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={portal?.slug ?? ""} placeholder="auto from title" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={portal?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Versions</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVersions((prev) => [...prev, { ...EMPTY_VERSION }])}
          >
            Add version
          </Button>
        </div>
        {versions.map((version, index) => (
          <div key={String(version.id ?? `ver-${index}`)} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Slug"
              value={String(version.slug ?? "")}
              onChange={(e) =>
                setVersions((prev) =>
                  prev.map((v, i) => (i === index ? { ...v, slug: e.target.value } : v))
                )
              }
            />
            <NestedLocalizedRowInput
              row={version}
              field="label"
              label="Label"
              onChange={(nextRow) =>
                setVersions((prev) => prev.map((v, i) => (i === index ? nextRow : v)))
              }
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={Boolean(version.isDefault)}
                onChange={(e) =>
                  setVersions((prev) =>
                    prev.map((v, i) => (i === index ? { ...v, isDefault: e.target.checked } : v))
                  )
                }
              />
              Default
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setVersions((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Sections</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSections((prev) => [...prev, { ...EMPTY_SECTION }])}
          >
            Add section
          </Button>
        </div>
        {sections.map((section, index) => (
          <div key={String(section.id ?? `sec-${index}`)} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Slug"
                value={String(section.slug ?? "")}
                onChange={(e) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, slug: e.target.value } : s))
                  )
                }
              />
              <Input
                placeholder="Href"
                value={String(section.href ?? "")}
                onChange={(e) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, href: e.target.value } : s))
                  )
                }
              />
              <Input
                placeholder="Version ID (optional)"
                value={String(section.versionId ?? "")}
                onChange={(e) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, versionId: e.target.value } : s))
                  )
                }
              />
              <NestedLocalizedRowInput
                row={section}
                field="title"
                label="Title"
                onChange={(nextRow) =>
                  setSections((prev) => prev.map((s, i) => (i === index ? nextRow : s)))
                }
              />
            </div>
            <NestedLocalizedRowInput
              row={section}
              field="content"
              label="Content"
              multiline
              rows={3}
              onChange={(nextRow) =>
                setSections((prev) => prev.map((s, i) => (i === index ? nextRow : s)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      ) : null}
    </form>
  );
}
