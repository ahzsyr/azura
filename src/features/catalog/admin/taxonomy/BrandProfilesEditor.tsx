"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CatalogEmptyState,
  CatalogSearch,
  CatalogStat,
  CatalogStatGroup,
} from "@/features/catalog/admin/ui";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import { BrandProfileEditDialog } from "./BrandProfileEditDialog";
import { cn } from "@/lib/utils";
import { countRuleLeaves, upgradeLegacyRuleSet } from "@/features/categories/matching";

type Props = {
  profiles: CatalogBrandProfile[];
  onChange: (next: CatalogBrandProfile[]) => void;
  locale?: string;
};

export function BrandProfilesEditor({ profiles, onChange, locale }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "featured">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const featuredCount = profiles.filter((profile) => profile.featured).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .map((profile, index) => ({ profile, index }))
      .filter(({ profile }) => {
        if (filter === "featured" && !profile.featured) return false;
        if (!q) return true;
        return (
          profile.name.toLowerCase().includes(q) ||
          profile.slug.toLowerCase().includes(q) ||
          profile.href.toLowerCase().includes(q)
        );
      });
  }, [profiles, query, filter]);

  const openCreate = () => {
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const removeAt = (index: number) => {
    onChange(profiles.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setDialogOpen(false);
      setEditingIndex(null);
    }
  };

  const toggleFeatured = (index: number) => {
    onChange(
      profiles.map((profile, i) =>
        i === index ? { ...profile, featured: !profile.featured } : profile,
      ),
    );
  };

  const handleRowKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEdit(index);
    }
  };

  const editingProfile = editingIndex !== null ? profiles[editingIndex] ?? null : null;
  const filteredEmpty = profiles.length > 0 && visible.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CatalogSearch
          value={query}
          onChange={setQuery}
          placeholder="Search brands…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <CatalogStatGroup>
            <CatalogStat
              label="All"
              value={profiles.length}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            <CatalogStat
              label="Featured"
              value={featuredCount}
              active={filter === "featured"}
              onClick={() => setFilter("featured")}
            />
          </CatalogStatGroup>
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            Add brand
          </Button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <CatalogEmptyState
          title="No brands yet"
          description="Add a brand to use it in product filters, brand pages, and storefront showcases."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              Add brand
            </Button>
          }
        />
      ) : filteredEmpty ? (
        <CatalogEmptyState
          status="filtered_empty"
          title="No matching brands"
          description="Try a different search or clear the featured filter."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border/70 divide-y bg-background">
          {visible.map(({ profile, index }) => {
            const ruleCount = countRuleLeaves(upgradeLegacyRuleSet(profile.conditions));
            return (
            <li
              key={profile.slug || `brand-${index}`}
              className="group flex items-center gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/40 sm:px-4"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                onClick={() => openEdit(index)}
                onKeyDown={(e) => handleRowKeyDown(index, e)}
              >
                <div
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40"
                  aria-hidden
                >
                  {profile.logoUrl ? (
                    <img
                      src={profile.logoUrl}
                      alt=""
                      className="size-full object-contain p-1"
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
                    {ruleCount > 0 ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ruleCount} rule{ruleCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <code>{profile.slug}</code>
                    {profile.href ? (
                      <span className="truncate max-w-[16rem]">{profile.href}</span>
                    ) : null}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={profile.featured ? "Remove featured" : "Mark featured"}
                  className={cn(profile.featured && "text-amber-600")}
                  onClick={() => toggleFeatured(index)}
                >
                  <Star className={cn("size-4", profile.featured && "fill-current")} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Edit brand"
                  onClick={() => openEdit(index)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label="Remove brand"
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {visible.length === profiles.length
          ? `${profiles.length} brand${profiles.length === 1 ? "" : "s"}`
          : `Showing ${visible.length} of ${profiles.length} brands`}
      </p>

      <BrandProfileEditDialog
        open={dialogOpen}
        mode={editingIndex === null ? "create" : "edit"}
        profile={editingProfile}
        existing={profiles}
        locale={locale}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingIndex(null);
        }}
        onSave={(next) => {
          if (editingIndex === null) {
            onChange([...profiles, { ...next, sortOrder: next.sortOrder || profiles.length }]);
            return;
          }
          onChange(profiles.map((profile, i) => (i === editingIndex ? next : profile)));
        }}
      />
    </div>
  );
}
