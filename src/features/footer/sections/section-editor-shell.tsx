"use client";

import type { FooterColumn, FooterMenuSource } from "@/features/footer/types";
import type { FooterSectionPlugin } from "@/features/footer/sections/types";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  FooterColumnBodyField,
  FooterColumnHeadingField,
} from "@/features/footer/admin/footer-localized-fields";
import { FooterLinksEditor } from "@/features/footer/admin/footer-links-editor";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";
import { cn } from "@/lib/utils";

type Props = {
  column: FooterColumn;
  plugin: FooterSectionPlugin;
  onUpdate: (patch: Partial<FooterColumn>) => void;
  /** Number of desktop grid columns — controls how many slot buttons to show. */
  desktopColumns?: 2 | 3 | 4;
};

const MENU_SOURCE_LABELS: Record<FooterMenuSource, string> = {
  custom: "Custom links",
  header: "Header menu",
  footer: "Footer menu",
  category: "Category menu",
  collection: "Collection menu",
};

export function SectionEditorShell({ column, plugin, onUpdate, desktopColumns = 3 }: Props) {
  const { fields } = plugin;
  const showLinks =
    fields.links &&
    (!fields.menuSource || (column.menuSource ?? "custom") === "custom") &&
    // Skip generic links editor when the type-specific Editor handles its own links
    !plugin.Editor;
  const hasContent = fields.body || showLinks || fields.companyData || plugin.Editor;

  return (
    <div className="space-y-5">
      {/* ── General ─────────────────────────────────────── */}
      <div className="space-y-4">
        {fields.visibility ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={column.enabled !== false}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
            />
            <span className="font-medium">Enabled</span>
          </label>
        ) : null}

        {fields.heading ? (
          <FooterColumnHeadingField
            columnId={column.id}
            defaultHeading={column.title ?? ""}
            onDefaultHeadingChange={(title) => onUpdate({ title })}
          />
        ) : null}

        {fields.menuSource ? (
          <div className="space-y-1.5">
            <Label>Menu source</Label>
            <HeaderSelect
              value={column.menuSource ?? "custom"}
              onChange={(v) => onUpdate({ menuSource: v as FooterMenuSource })}
            >
              {(Object.entries(MENU_SOURCE_LABELS) as [FooterMenuSource, string][]).map(
                ([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ),
              )}
            </HeaderSelect>
          </div>
        ) : null}
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      {hasContent ? (
        <>
          <Separator />
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Content
            </p>

            {fields.companyData ? (
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm font-medium">Contact fields</Label>
                {(
                  [
                    ["showPhone", "Phone number"],
                    ["showEmail", "Email address"],
                    ["showAddress", "Street address"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded"
                      checked={column[key] !== false}
                      onChange={(e) => onUpdate({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}

            {fields.body ? (
              <FooterColumnBodyField
                columnId={column.id}
                defaultBody={column.body ?? ""}
                onDefaultBodyChange={(body) => onUpdate({ body })}
              />
            ) : null}

            {showLinks ? (
              <FooterLinksEditor
                columnId={column.id}
                links={column.links ?? []}
                onChange={(links) => onUpdate({ links })}
              />
            ) : null}

            {plugin.Editor ? <plugin.Editor column={column} onUpdate={onUpdate} /> : null}
          </div>
        </>
      ) : null}

      {/* ── Appearance ──────────────────────────────────── */}
      <Separator />
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Appearance
        </p>

        {/* Column placement */}
        <div className="space-y-2">
          <Label>Column placement</Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: desktopColumns }, (_, i) => i + 1).map((slot) => (
              <button
                key={slot}
                type="button"
                title={`Pin to column ${slot}`}
                className={cn(
                  "h-8 min-w-[2rem] rounded-md border px-2.5 text-sm font-medium transition-colors",
                  column.columnSlot === slot
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
                onClick={() =>
                  onUpdate({
                    columnSlot: column.columnSlot === slot ? undefined : (slot as 1 | 2 | 3 | 4),
                  })
                }
              >
                {slot}
              </button>
            ))}
            {column.columnSlot != null ? (
              <button
                type="button"
                className="h-8 rounded-md border border-dashed px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onUpdate({ columnSlot: undefined })}
              >
                Auto
              </button>
            ) : (
              <span className="flex h-8 items-center px-1 text-xs text-muted-foreground">Auto</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pin to a specific column. &ldquo;Auto&rdquo; places by array order.
          </p>
        </div>

        {/* Responsive visibility */}
        <div className="space-y-2">
          <Label>Hide on</Label>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={column.hiddenOnTablet === true}
                onChange={(e) => onUpdate({ hiddenOnTablet: e.target.checked || undefined })}
              />
              Tablet
              <span className="text-xs text-muted-foreground">(640–1024 px)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={column.hiddenOnMobile === true}
                onChange={(e) => onUpdate({ hiddenOnMobile: e.target.checked || undefined })}
              />
              Mobile
              <span className="text-xs text-muted-foreground">(&lt; 640 px)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
