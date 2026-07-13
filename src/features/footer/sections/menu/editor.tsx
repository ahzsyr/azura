"use client";

import { useStore } from "@nanostores/react";
import type { FooterMenuSource } from "../../types";
import type { SectionEditorProps } from "../types";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";
import { $workspace } from "@/features/navigation/header-store";

const MENU_SOURCES: { value: FooterMenuSource; label: string }[] = [
  { value: "custom", label: "Custom links" },
  { value: "header", label: "Header menu" },
  { value: "footer", label: "Footer menu key" },
  { value: "category", label: "Category menu" },
  { value: "collection", label: "Collection menu" },
];

export function MenuEditor({ column, onUpdate }: SectionEditorProps) {
  const headerWorkspace = useStore($workspace);
  const menuKeys = Object.keys(headerWorkspace.menusDatabase ?? {});
  const source = column.menuSource ?? "custom";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Link source</Label>
        <div className="flex flex-col gap-2">
          {MENU_SOURCES.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`menu-source-${column.id}`}
                checked={source === opt.value}
                onChange={() => onUpdate({ menuSource: opt.value })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      {(source === "header" || source === "footer") && menuKeys.length > 0 ? (
        <div className="space-y-2">
          <Label>Menu key</Label>
          <HeaderSelect
            value={column.headerMenuKey ?? headerWorkspace.activeMenuKey}
            onChange={(v) => onUpdate({ headerMenuKey: v })}
          >
            {menuKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </HeaderSelect>
        </div>
      ) : null}
      {source !== "custom" ? (
        <p className="text-xs text-muted-foreground">
          Links are resolved from the selected source when the footer is published.
        </p>
      ) : null}
    </div>
  );
}
