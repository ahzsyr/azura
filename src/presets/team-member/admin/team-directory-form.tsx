"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { TeamDepartment, TeamDirectory, TeamMember } from "@prisma/client";
import { upsertTeamDirectory } from "@/presets/team-member/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type DirectoryWithChildren = TeamDirectory & {
  departments: TeamDepartment[];
  members: TeamMember[];
};

type DepartmentDraft = { id?: string; nameEn: string; nameAr: string };

type MemberDraft = {
  id?: string;
  departmentId: string;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  bioEn: string;
  bioAr: string;
  email: string;
  phone: string;
  locationEn: string;
  locationAr: string;
  skills: string;
  imageUrl: string;
};

function parseSkills(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export function TeamDirectoryForm({
  directory,
  mode = directory ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  directory?: DirectoryWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [departments, setDepartments] = useState<DepartmentDraft[]>(
    directory?.departments.map((d) => ({ id: d.id, nameEn: "", nameAr: "" })) ?? []
  );
  const [members, setMembers] = useState<MemberDraft[]>(
    directory?.members.map((m) => ({
      id: m.id,
      departmentId: m.departmentId ?? "",
      nameEn: "",
      nameAr: "",
      roleEn: "",
      roleAr: "",
      bioEn: "",
      bioAr: "",
      email: m.email,
      phone: m.phone,
      locationEn: "",
      locationAr: "",
      skills: parseSkills(m.skills),
      imageUrl: m.imageUrl,
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
    const membersPayload = members.map((m) => ({
      ...m,
      skills: m.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    formData.set("departmentsJson", JSON.stringify(departments));
    formData.set("membersJson", JSON.stringify(membersPayload));
    startTransition(async () => {
      const saved = await upsertTeamDirectory(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/team/${saved.id}`);
      else {
        adminForm?.showToast("Team directory saved", "success");
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
      {directory && <input type="hidden" name="id" value={directory.id} />}
      <input type="hidden" name="sortOrder" value={directory?.sortOrder ?? 0} />

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={directory ?? undefined} required />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={directory?.slug ?? ""} placeholder="auto from title" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={directory?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Departments</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDepartments((prev) => [...prev, { nameEn: "", nameAr: "" }])}
          >
            Add department
          </Button>
        </div>
        {departments.map((dept, index) => (
          <div key={dept.id ?? `dept-${index}`} className="flex flex-wrap gap-2">
            <Input
              placeholder="Name EN"
              value={dept.nameEn}
              onChange={(e) =>
                setDepartments((prev) => prev.map((d, i) => (i === index ? { ...d, nameEn: e.target.value } : d)))
              }
            />
            <Input
              placeholder="Name AR"
              dir="rtl"
              value={dept.nameAr}
              onChange={(e) =>
                setDepartments((prev) => prev.map((d, i) => (i === index ? { ...d, nameAr: e.target.value } : d)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDepartments((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Members</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setMembers((prev) => [
                ...prev,
                {
                  departmentId: "",
                  nameEn: "",
                  nameAr: "",
                  roleEn: "",
                  roleAr: "",
                  bioEn: "",
                  bioAr: "",
                  email: "",
                  phone: "",
                  locationEn: "",
                  locationAr: "",
                  skills: "",
                  imageUrl: "",
                },
              ])
            }
          >
            Add member
          </Button>
        </div>
        {members.map((member, index) => (
          <div key={member.id ?? `mem-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Name EN"
              value={member.nameEn}
              onChange={(e) =>
                setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, nameEn: e.target.value } : m)))
              }
            />
            <Input
              placeholder="Role EN"
              value={member.roleEn}
              onChange={(e) =>
                setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, roleEn: e.target.value } : m)))
              }
            />
            <Input
              placeholder="Department ID (optional)"
              value={member.departmentId}
              onChange={(e) =>
                setMembers((prev) =>
                  prev.map((m, i) => (i === index ? { ...m, departmentId: e.target.value } : m))
                )
              }
            />
            <Input
              placeholder="Email"
              value={member.email}
              onChange={(e) =>
                setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, email: e.target.value } : m)))
              }
            />
            <Input
              placeholder="Skills (comma-separated)"
              value={member.skills}
              onChange={(e) =>
                setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, skills: e.target.value } : m)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMembers((prev) => prev.filter((_, i) => i !== index))}
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
