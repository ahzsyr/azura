"use client";

import { useMemo, useState } from "react";
import type { BlockNode } from "@/types/builder";
import { BLOCK_CATEGORIES, BLOCK_TYPES, getBlockMeta } from "../block-registry";
import { SHOWCASE_BLOCK_PRESETS } from "@/features/builder/blocks/commerce/commerce-showcase/lib/showcase-block-presets";
import { BlockTypeIcon } from "./block-type-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: BlockNode["type"], parentId?: string | null) => void;
  onAddWithProps?: (
    type: BlockNode["type"],
    props: Record<string, unknown>,
    parentId?: string | null,
  ) => void;
  parentId?: string | null;
  title?: string;
};

export function BlockPickerModal({
  open,
  onOpenChange,
  onAdd,
  onAddWithProps,
  parentId,
  title = "Add block",
}: Props) {
  const [query, setQuery] = useState("");

  const filteredBlocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCK_TYPES;
    return BLOCK_TYPES.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredPresets = useMemo(() => {
    if (!onAddWithProps) return [];
    const q = query.trim().toLowerCase();
    if (!q) return SHOWCASE_BLOCK_PRESETS;
    return SHOWCASE_BLOCK_PRESETS.filter(
      (preset) =>
        preset.label.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.type.toLowerCase().includes(q),
    );
  }, [query, onAddWithProps]);

  const handleSelect = (type: BlockNode["type"]) => {
    onAdd(type, parentId);
    onOpenChange(false);
    setQuery("");
  };

  const handlePresetSelect = (preset: (typeof SHOWCASE_BLOCK_PRESETS)[number]) => {
    if (!onAddWithProps) return;
    onAddWithProps(preset.type, preset.propsPatch, parentId);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <div className="p-6 pb-4 border-b space-y-4">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1">
              Choose a block type to add to your page
            </DialogDescription>
          </div>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blocks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto p-6 pt-4 flex-1">
          {query.trim() ? (
            <div className="space-y-6">
              {filteredPresets.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Commerce presets
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredPresets.map((preset) => (
                      <PresetBlockTile
                        key={preset.id}
                        preset={preset}
                        onSelect={handlePresetSelect}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                {filteredPresets.length > 0 ? (
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    All blocks
                  </h3>
                ) : null}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredBlocks.map((block) => (
                    <BlockTile key={block.type} block={block} onSelect={handleSelect} />
                  ))}
                  {filteredBlocks.length === 0 && filteredPresets.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                      No blocks match your search.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {BLOCK_CATEGORIES.map((cat) => {
                const items = BLOCK_TYPES.filter((b) => b.category === cat.id);
                const presets =
                  cat.id === "commerce" && onAddWithProps ? SHOWCASE_BLOCK_PRESETS : [];
                if (items.length === 0 && presets.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      {cat.label}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {presets.map((preset) => (
                        <PresetBlockTile
                          key={preset.id}
                          preset={preset}
                          onSelect={handlePresetSelect}
                        />
                      ))}
                      {items.map((block) => (
                        <BlockTile key={block.type} block={block} onSelect={handleSelect} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockTile({
  block,
  onSelect,
}: {
  block: (typeof BLOCK_TYPES)[number];
  onSelect: (type: BlockNode["type"]) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(block.type)}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-start",
        "hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <BlockTypeIcon icon={block.icon} />
      </div>
      <div>
        <p className="text-sm font-medium">{block.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{block.description}</p>
      </div>
    </button>
  );
}

function PresetBlockTile({
  preset,
  onSelect,
}: {
  preset: (typeof SHOWCASE_BLOCK_PRESETS)[number];
  onSelect: (preset: (typeof SHOWCASE_BLOCK_PRESETS)[number]) => void;
}) {
  const meta = getBlockMeta(preset.type);
  const icon = meta?.icon ?? "layout-grid";
  const description = preset.description || meta?.description || "";

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-start",
        "hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <BlockTypeIcon icon={icon} />
      </div>
      <div>
        <p className="text-sm font-medium">{preset.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
      </div>
    </button>
  );
}
