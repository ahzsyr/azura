"use client";

import { useCallback, useRef } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import {
  getCustomHtmlItems,
  type CustomHtmlItem,
} from "@/features/builder/blocks/content/lib/custom-html-items";
import type { BlockNode } from "@/types/builder";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function CustomHtmlBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);
  const htmlKey = `html${suffix}`;

  const blockRef = useRef(block);
  blockRef.current = block;

  const items = getCustomHtmlItems(block.props);

  const setItems = useCallback(
    (next: CustomHtmlItem[]) => {
      onChange(patchBlockSettings(blockRef.current, { items: next }));
    },
    [onChange]
  );

  const addItem = () => {
    setItems([...items, { id: newId("chi") }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
  };

  const toggleHidden = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item)));
  };

  const updateHtml = useCallback(
    (id: string, value: string) => {
      const current = getCustomHtmlItems(blockRef.current.props);
      const next = current.map((item) => (item.id === id ? { ...item, [htmlKey]: value } : item));
      onChange(patchBlockSettings(blockRef.current, { items: next }));
    },
    [htmlKey, onChange]
  );

  const label = isDefault ? "HTML" : `HTML (${activeLocale.label})`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          {items.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {items.map((item, index) => {
          const defaultSuffix = getContentFieldSuffix(defaultCode);
          const defaultHtmlKey = `html${defaultSuffix}`;
          const currentValue = (item[htmlKey] as string) ?? "";
          const fallbackValue =
            (typeof item.html === "string" ? item.html.trim() : "") ||
            (typeof item[defaultHtmlKey] === "string" ? (item[defaultHtmlKey] as string).trim() : "") ||
            "";

          return (
            <div
              key={item.id}
              className={`rounded-md border bg-card overflow-hidden${item.hidden ? " opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Item {index + 1}
                  {item.hidden ? " (hidden)" : ""}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === 0}
                    onClick={() => moveItem(item.id, -1)}
                    aria-label="Move item up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                    aria-label="Move item down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleHidden(item.id)}
                    aria-label={item.hidden ? "Show item" : "Hide item"}
                  >
                    {item.hidden ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <textarea
                className="w-full resize-y bg-transparent px-3 py-2 text-sm font-mono focus:outline-none min-h-[120px]"
                value={currentValue}
                placeholder={
                  !isDefault && !currentValue.trim() && fallbackValue.trim()
                    ? `Shows default on site if empty: ${fallbackValue.slice(0, 80)}${fallbackValue.length > 80 ? "…" : ""}`
                    : "<!-- HTML content -->"
                }
                onChange={(e) => updateHtml(item.id, e.target.value)}
              />
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No HTML items yet. Click "Add HTML" to create one.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={addItem}
        >
          <Plus className="h-3.5 w-3.5" />
          Add HTML
        </Button>
      </div>
    </div>
  );
}
