"use client";

import { useStore } from "@nanostores/react";
import type { SectionEditorProps } from "../types";
import { FooterLinksEditor } from "@/features/footer/admin/footer-links-editor";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";
import { $workspace } from "@/features/navigation/header-store";

export function MenuEditor({ column, onUpdate }: SectionEditorProps) {
  const headerWorkspace = useStore($workspace);
  const menusDatabase = headerWorkspace.menusDatabase ?? {};
  const menuKeys = Object.keys(menusDatabase);
  const source = column.menuSource ?? "custom";

  return (
    <div className="space-y-4">
      {(source === "header" || source === "footer") && menuKeys.length > 0 ? (
        <div className="space-y-2">
          <Label>Menu key</Label>
          <HeaderSelect
            value={column.headerMenuKey ?? headerWorkspace.activeMenuKey}
            onChange={(v) => onUpdate({ headerMenuKey: v })}
          >
            {menuKeys.map((key) => (
              <option key={key} value={key}>
                {menusDatabase[key]?.name?.trim() || key}
              </option>
            ))}
          </HeaderSelect>
        </div>
      ) : null}

      {source === "custom" ? (
        <FooterLinksEditor
          columnId={column.id}
          links={column.links ?? []}
          onChange={(links) => onUpdate({ links })}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Links are resolved from the selected source when the footer is published.
        </p>
      )}
    </div>
  );
}
