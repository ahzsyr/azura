"use client";

import { useStore } from "@nanostores/react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FooterColumn, FooterColumnType } from "@/features/footer/types";
import {
  $footerWorkspace,
  addFooterColumn,
  moveFooterColumn,
  removeFooterColumn,
  updateFooterColumn,
} from "@/features/footer/footer-store";
import { saveFooterWorkspaceToServer } from "@/features/footer/footer-workspace-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

const COLUMN_TYPES: { value: FooterColumnType; label: string }[] = [
  { value: "brand", label: "Brand" },
  { value: "menu", label: "Menu / links" },
  { value: "contact", label: "Contact" },
  { value: "social", label: "Social" },
  { value: "text", label: "Text block" },
  { value: "legal", label: "Legal links" },
];

function newColumnId() {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function FooterColumnsPanel() {
  const workspace = useStore($footerWorkspace);
  const [editingId, setEditingId] = useState<string | null>(null);

  const persist = () => void saveFooterWorkspaceToServer();

  const addColumn = () => {
    const id = newColumnId();
    addFooterColumn({
      id,
      type: "text",
      title: "New column",
      enabled: true,
      links: [],
    });
    setEditingId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add and reorder footer columns. Brand pulls from Theme site identity.
        </p>
        <Button type="button" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4" />
          Add column
        </Button>
      </div>

      <div className="space-y-3">
        {workspace.columns.map((col, idx) => (
          <Card key={col.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm">{col.title || col.type}</CardTitle>
                <Badge variant="secondary">{col.type}</Badge>
                {!col.enabled ? <Badge variant="outline">Disabled</Badge> : null}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={idx === 0}
                  onClick={() => {
                    moveFooterColumn(col.id, -1);
                    persist();
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={idx === workspace.columns.length - 1}
                  onClick={() => {
                    moveFooterColumn(col.id, 1);
                    persist();
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    removeFooterColumn(col.id);
                    persist();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(editingId === col.id ? null : col.id)}>
                  Edit
                </Button>
              </div>
            </CardHeader>
            {editingId === col.id ? (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Column type</Label>
                    <HeaderSelect
                      value={col.type}
                      onChange={(v) => updateFooterColumn(col.id, { type: v as FooterColumnType })}
                    >
                      {COLUMN_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </HeaderSelect>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={col.title ?? ""}
                      onChange={(e) => updateFooterColumn(col.id, { title: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={col.enabled !== false}
                    onChange={(e) => updateFooterColumn(col.id, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                {(col.type === "menu" || col.type === "legal") && (
                  <div className="space-y-2">
                    <Label>Links (label | url per line)</Label>
                    <textarea
                      className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                      value={(col.links ?? []).map((l) => `${l.label} | ${l.href}`).join("\n")}
                      onChange={(e) => {
                        const links = e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [label, href] = line.split("|").map((s) => s.trim());
                            return { label: label || "Link", href: href || "#" };
                          });
                        updateFooterColumn(col.id, { links });
                      }}
                    />
                  </div>
                )}
                {col.type === "text" && (
                  <div className="space-y-2">
                    <Label>Body text</Label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                      value={col.body ?? ""}
                      onChange={(e) => updateFooterColumn(col.id, { body: e.target.value })}
                    />
                  </div>
                )}
                <LocaleTabPanel
                  entityType="FooterColumn"
                  entityId={col.id}
                  sourceData={{
                    heading: col.title ?? "",
                  }}
                />
                {(col.links ?? []).map((link, linkIdx) => (
                  <LocaleTabPanel
                    key={`${col.id}-link-${linkIdx}`}
                    entityType="FooterLink"
                    entityId={`${col.id}-link-${linkIdx}`}
                    sourceData={{
                      label: link.label,
                    }}
                  />
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    persist();
                  }}
                >
                  Done
                </Button>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
