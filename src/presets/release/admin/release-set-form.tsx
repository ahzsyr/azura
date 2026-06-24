"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { Release, ReleaseEntry, ReleaseSet } from "@prisma/client";
import { upsertReleaseSet } from "@/presets/release/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type SetWithChildren = ReleaseSet & {
  releases: (Release & { entries: ReleaseEntry[] })[];
};

type ReleaseDraft = {
  id?: string;
  version: string;
  status: string;
  isPublished: boolean;
  entries: { id?: string; category: string; textEn: string; textAr: string }[];
};

export function ReleaseSetForm({
  releaseSet,
  mode = releaseSet ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  releaseSet?: SetWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [releases, setReleases] = useState<ReleaseDraft[]>(
    releaseSet?.releases.map((r) => ({
      id: r.id,
      version: r.version,
      status: r.status,
      isPublished: r.isPublished,
      entries: r.entries.map((e) => ({
        id: e.id,
        category: e.category,
        textEn: "",
        textAr: "",
      })),
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
    formData.set("releasesJson", JSON.stringify(releases));
    startTransition(async () => {
      const saved = await upsertReleaseSet(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/releases/${saved.id}`);
      else {
        adminForm?.showToast("Saved", "success");
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
      {releaseSet && <input type="hidden" name="id" value={releaseSet.id} />}
      <input type="hidden" name="sortOrder" value={releaseSet?.sortOrder ?? 0} />
      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={releaseSet ?? undefined} required />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={releaseSet?.slug ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={releaseSet?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex justify-between">
          <h4 className="font-medium">Releases</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setReleases((prev) => [
                ...prev,
                { version: "", status: "RELEASED", isPublished: true, entries: [] },
              ])
            }
          >
            Add version
          </Button>
        </div>
        {releases.map((release, ri) => (
          <div key={release.id ?? `r-${ri}`} className="rounded-md border p-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Version"
                value={release.version}
                onChange={(e) =>
                  setReleases((prev) =>
                    prev.map((r, i) => (i === ri ? { ...r, version: e.target.value } : r))
                  )
                }
              />
              <Input
                placeholder="Status (RELEASED, BETA, DEPRECATED)"
                value={release.status}
                onChange={(e) =>
                  setReleases((prev) =>
                    prev.map((r, i) => (i === ri ? { ...r, status: e.target.value } : r))
                  )
                }
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setReleases((prev) =>
                  prev.map((r, i) =>
                    i === ri
                      ? {
                          ...r,
                          entries: [...r.entries, { category: "FEATURES", textEn: "", textAr: "" }],
                        }
                      : r
                  )
                )
              }
            >
              Add changelog line
            </Button>
            {release.entries.map((entry, ei) => (
              <div key={entry.id ?? `e-${ei}`} className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Category"
                  value={entry.category}
                  onChange={(e) =>
                    setReleases((prev) =>
                      prev.map((r, i) =>
                        i === ri
                          ? {
                              ...r,
                              entries: r.entries.map((en, j) =>
                                j === ei ? { ...en, category: e.target.value } : en
                              ),
                            }
                          : r
                      )
                    )
                  }
                />
                <Input
                  placeholder="Text EN"
                  value={entry.textEn}
                  onChange={(e) =>
                    setReleases((prev) =>
                      prev.map((r, i) =>
                        i === ri
                          ? {
                              ...r,
                              entries: r.entries.map((en, j) =>
                                j === ei ? { ...en, textEn: e.target.value } : en
                              ),
                            }
                          : r
                      )
                    )
                  }
                />
                <Input
                  placeholder="Text AR"
                  dir="rtl"
                  value={entry.textAr}
                  onChange={(e) =>
                    setReleases((prev) =>
                      prev.map((r, i) =>
                        i === ri
                          ? {
                              ...r,
                              entries: r.entries.map((en, j) =>
                                j === ei ? { ...en, textAr: e.target.value } : en
                              ),
                            }
                          : r
                      )
                    )
                  }
                />
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setReleases((prev) => prev.filter((_, i) => i !== ri))}>
              Remove version
            </Button>
          </div>
        ))}
      </div>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      ) : null}
    </form>
  );
}
