"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { DocPortal, DocSection, DocVersion } from "@prisma/client";
import { upsertDocPortal } from "@/features/documentation/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type PortalWithChildren = DocPortal & {
  versions: DocVersion[];
  sections: DocSection[];
};

type VersionDraft = {
  id?: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  isDefault: boolean;
};

type SectionDraft = {
  id?: string;
  versionId: string;
  parentId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  href: string;
  contentEn: string;
  contentAr: string;
};

export function DocPortalForm({
  portal,
  mode = portal ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  portal?: PortalWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [versions, setVersions] = useState<VersionDraft[]>(
    portal?.versions.map((v) => ({
      id: v.id,
      slug: v.slug,
      labelEn: v.labelEn,
      labelAr: v.labelAr,
      isDefault: v.isDefault,
    })) ?? []
  );
  const [sections, setSections] = useState<SectionDraft[]>(
    portal?.sections.map((s) => ({
      id: s.id,
      versionId: s.versionId ?? "",
      parentId: s.parentId ?? "",
      slug: s.slug,
      titleEn: s.titleEn,
      titleAr: s.titleAr,
      href: s.href,
      contentEn: s.contentEn,
      contentAr: s.contentAr,
    })) ?? []
  );

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

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={portal ?? undefined} required />
      <AdminLocalizedFormField fieldKey="description" label="Description" legacyEntity={portal ?? undefined} />
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
            onClick={() =>
              setVersions((prev) => [...prev, { slug: "", labelEn: "", labelAr: "", isDefault: false }])
            }
          >
            Add version
          </Button>
        </div>
        {versions.map((version, index) => (
          <div key={version.id ?? `ver-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Slug"
              value={version.slug}
              onChange={(e) =>
                setVersions((prev) => prev.map((v, i) => (i === index ? { ...v, slug: e.target.value } : v)))
              }
            />
            <Input
              placeholder="Label EN"
              value={version.labelEn}
              onChange={(e) =>
                setVersions((prev) => prev.map((v, i) => (i === index ? { ...v, labelEn: e.target.value } : v)))
              }
            />
            <Input
              placeholder="Label AR"
              dir="rtl"
              value={version.labelAr}
              onChange={(e) =>
                setVersions((prev) => prev.map((v, i) => (i === index ? { ...v, labelAr: e.target.value } : v)))
              }
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={version.isDefault}
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
            onClick={() =>
              setSections((prev) => [
                ...prev,
                {
                  versionId: "",
                  parentId: "",
                  slug: "",
                  titleEn: "",
                  titleAr: "",
                  href: "",
                  contentEn: "",
                  contentAr: "",
                },
              ])
            }
          >
            Add section
          </Button>
        </div>
        {sections.map((section, index) => (
          <div key={section.id ?? `sec-${index}`} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Slug"
                value={section.slug}
                onChange={(e) =>
                  setSections((prev) => prev.map((s, i) => (i === index ? { ...s, slug: e.target.value } : s)))
                }
              />
              <Input
                placeholder="Href"
                value={section.href}
                onChange={(e) =>
                  setSections((prev) => prev.map((s, i) => (i === index ? { ...s, href: e.target.value } : s)))
                }
              />
              <Input
                placeholder="Version ID (optional)"
                value={section.versionId}
                onChange={(e) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, versionId: e.target.value } : s))
                  )
                }
              />
              <Input
                placeholder="Title EN"
                value={section.titleEn}
                onChange={(e) =>
                  setSections((prev) => prev.map((s, i) => (i === index ? { ...s, titleEn: e.target.value } : s)))
                }
              />
            </div>
            <Input
              placeholder="Content EN"
              value={section.contentEn}
              onChange={(e) =>
                setSections((prev) => prev.map((s, i) => (i === index ? { ...s, contentEn: e.target.value } : s)))
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
