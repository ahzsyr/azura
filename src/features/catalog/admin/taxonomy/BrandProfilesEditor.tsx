"use client";

import { useCallback, useState } from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  brandNameToSlug,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { BrandProfileEditDialog } from "./BrandProfileEditDialog";

type Props = {
  profiles: CatalogBrandProfile[];
  onChange: (next: CatalogBrandProfile[]) => void;
};

function newProfile(name: string, sortOrder: number): CatalogBrandProfile {
  return {
    slug: brandNameToSlug(name),
    name,
    logoUrl: "",
    bannerUrl: "",
    descriptionEn: "",
    descriptionAr: "",
    href: "",
    featured: false,
    sortOrder,
  };
}

export function BrandProfilesEditor({ profiles, onChange }: Props) {
  const [draftName, setDraftName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateAt = useCallback(
    (index: number, patch: Partial<CatalogBrandProfile>) => {
      const next = profiles.map((p, i) => {
        if (i !== index) return p;
        const merged = { ...p, ...patch };
        if (patch.name && !patch.slug) {
          merged.slug = brandNameToSlug(merged.name) || p.slug;
        }
        return merged;
      });
      onChange(next);
    },
    [profiles, onChange],
  );

  const addProfile = () => {
    const name = draftName.trim();
    if (!name) return;
    if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setDraftName("");
      return;
    }
    const nextProfiles = [...profiles, newProfile(name, profiles.length)];
    onChange(nextProfiles);
    setDraftName("");
    setEditingIndex(nextProfiles.length - 1);
  };

  const removeAt = (index: number) => {
    onChange(profiles.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const openEdit = (index: number) => setEditingIndex(index);

  const handleRowKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEdit(index);
    }
  };

  const editingProfile = editingIndex !== null ? profiles[editingIndex] ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Add brand name…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addProfile();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={addProfile}>
          Add brand
        </Button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-md border-dashed">
          No brand profiles yet. Add brands or sync from the product catalog.
        </p>
      ) : (
        <ul className="rounded-md border divide-y overflow-hidden">
          {profiles.map((profile, index) => (
            <li
              key={profile.slug || index}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openEdit(index)}
              onKeyDown={(e) => handleRowKeyDown(index, e)}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 overflow-hidden"
                aria-hidden
              >
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt=""
                    className="size-full object-contain p-0.5"
                  />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">
                    {profile.name || "Untitled brand"}
                  </span>
                  {profile.featured ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Featured
                    </Badge>
                  ) : null}
                </div>
                <code className="text-xs text-muted-foreground">{profile.slug}</code>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Edit brand profile"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(index);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label="Remove brand profile"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{profiles.length} brand profile(s)</p>

      <BrandProfileEditDialog
        open={editingIndex !== null}
        profile={editingProfile}
        onOpenChange={(open) => {
          if (!open) setEditingIndex(null);
        }}
        onSave={(patch) => {
          if (editingIndex !== null) updateAt(editingIndex, patch);
        }}
      />
    </div>
  );
}
