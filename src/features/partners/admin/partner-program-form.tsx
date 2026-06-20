"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { Partner, PartnerCategory, PartnerProgram } from "@prisma/client";
import { upsertPartnerProgram } from "@/features/partners/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type ProgramWithChildren = PartnerProgram & {
  categories: PartnerCategory[];
  partners: Partner[];
};

type CategoryDraft = { id?: string; slug: string; nameEn: string; nameAr: string };

type PartnerDraft = {
  id?: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  logoUrl: string;
  websiteUrl: string;
  profileUrl: string;
  email: string;
  phone: string;
  locationEn: string;
  locationAr: string;
  latitude: string;
  longitude: string;
  certifications: string;
};

function parseCertifications(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export function PartnerProgramForm({
  program,
  mode = program ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  program?: ProgramWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CategoryDraft[]>(
    program?.categories.map((c) => ({ id: c.id, slug: c.slug, nameEn: "", nameAr: "" })) ?? []
  );
  const [partners, setPartners] = useState<PartnerDraft[]>(
    program?.partners.map((p) => ({
      id: p.id,
      categoryId: p.categoryId ?? "",
      nameEn: "",
      nameAr: "",
      descriptionEn: "",
      descriptionAr: "",
      logoUrl: p.logoUrl,
      websiteUrl: p.websiteUrl,
      profileUrl: p.profileUrl,
      email: p.email,
      phone: p.phone,
      locationEn: "",
      locationAr: "",
      latitude: p.latitude != null ? String(p.latitude) : "",
      longitude: p.longitude != null ? String(p.longitude) : "",
      certifications: parseCertifications(p.certifications),
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
    const partnersPayload = partners.map((p) => ({
      ...p,
      certifications: p.certifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    formData.set("categoriesJson", JSON.stringify(categories));
    formData.set("partnersJson", JSON.stringify(partnersPayload));
    startTransition(async () => {
      const saved = await upsertPartnerProgram(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/partners/${saved.id}`);
      else {
        adminForm?.showToast("Partner program saved", "success");
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
      {program && <input type="hidden" name="id" value={program.id} />}
      <input type="hidden" name="sortOrder" value={program?.sortOrder ?? 0} />

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={program ?? undefined} required />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={program?.slug ?? ""} placeholder="auto from title" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={program?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Categories</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCategories((prev) => [...prev, { slug: "", nameEn: "", nameAr: "" }])}
          >
            Add category
          </Button>
        </div>
        {categories.map((cat, index) => (
          <div key={cat.id ?? `cat-${index}`} className="flex flex-wrap gap-2">
            <Input
              placeholder="Slug"
              value={cat.slug}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, slug: e.target.value } : c)))
              }
            />
            <Input
              placeholder="Name EN"
              value={cat.nameEn}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, nameEn: e.target.value } : c)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCategories((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Partners</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setPartners((prev) => [
                ...prev,
                {
                  categoryId: "",
                  nameEn: "",
                  nameAr: "",
                  descriptionEn: "",
                  descriptionAr: "",
                  logoUrl: "",
                  websiteUrl: "",
                  profileUrl: "",
                  email: "",
                  phone: "",
                  locationEn: "",
                  locationAr: "",
                  latitude: "",
                  longitude: "",
                  certifications: "",
                },
              ])
            }
          >
            Add partner
          </Button>
        </div>
        {partners.map((partner, index) => (
          <div key={partner.id ?? `prt-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Name EN"
              value={partner.nameEn}
              onChange={(e) =>
                setPartners((prev) => prev.map((p, i) => (i === index ? { ...p, nameEn: e.target.value } : p)))
              }
            />
            <Input
              placeholder="Website URL"
              value={partner.websiteUrl}
              onChange={(e) =>
                setPartners((prev) => prev.map((p, i) => (i === index ? { ...p, websiteUrl: e.target.value } : p)))
              }
            />
            <Input
              placeholder="Category ID (optional)"
              value={partner.categoryId}
              onChange={(e) =>
                setPartners((prev) =>
                  prev.map((p, i) => (i === index ? { ...p, categoryId: e.target.value } : p))
                )
              }
            />
            <Input
              placeholder="Logo URL"
              value={partner.logoUrl}
              onChange={(e) =>
                setPartners((prev) => prev.map((p, i) => (i === index ? { ...p, logoUrl: e.target.value } : p)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPartners((prev) => prev.filter((_, i) => i !== index))}
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
