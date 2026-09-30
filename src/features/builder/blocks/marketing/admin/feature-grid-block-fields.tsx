"use client";

import { useEffect, useState } from "react";
import type { BlockNode } from "@/types/builder";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
  useBlockTranslationsOptional,
} from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyFeatureGridItem,
  FeatureGridCardForm,
} from "@/features/builder/blocks/marketing/admin/feature-grid-card-form";
import { readItemFieldValue } from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { normalizeFeatureGridProps } from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";
import type { FeatureGridItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

/** Translatable string fields that must clear EntityTranslation when props are emptied. */
const FEATURE_GRID_LOCALIZED_STRING_FIELDS = [
  "eyebrow",
  "headerCtaLabel",
  "readMoreLabel",
  "readLessLabel",
] as const;

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
        onClick={onToggle}
        aria-expanded={open}
      >
        {title}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-3 border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}

export function FeatureGridBlockFields({ block, onChange }: Props) {
  const cfg = normalizeFeatureGridProps(block.props);
  const items = (cfg.items as FeatureGridItem[]) ?? [];
  const setProp = (key: string, value: unknown) =>
    onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: FeatureGridItem[]) => setProp("items", next);

  const [openContent, setOpenContent] = useState(true);
  const [openLayout, setOpenLayout] = useState(false);
  const [openDesign, setOpenDesign] = useState(false);
  const [openExpand, setOpenExpand] = useState(false);

  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const translationCtx = useBlockTranslationsOptional();

  // Plain Input clears only left props empty while EntityTranslation kept the old
  // value (eyebrow still showed live). Push empty overrides so the next publish deletes those rows.
  useEffect(() => {
    if (!translationCtx) return;
    for (const field of FEATURE_GRID_LOCALIZED_STRING_FIELDS) {
      if (block.props[field] !== "") continue;
      const current =
        translationCtx.getFieldValues(block.id, field)[translationCtx.defaultLocaleCode]?.value ??
        "";
      if (current.trim()) {
        translationCtx.setFieldValue(block.id, field, translationCtx.defaultLocaleCode, "");
      }
    }
    // Intentionally once per block open — avoids override churn / loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync stale ET clears on mount only
  }, [block.id]);

  return (
    <div className="space-y-3">
      <Section title="01 Content" open={openContent} onToggle={() => setOpenContent((v) => !v)}>
        <LocalizedBlockTitle block={block} />
        <LocalizedBlockInput block={block} field="eyebrow" label="Eyebrow / label" />
        <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.showAccentLine}
            onChange={(e) => setProp("showAccentLine", e.target.checked)}
          />
          Show accent line
        </label>
        <div>
          <Label className="text-xs">Header alignment</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.headerAlign}
            onChange={(e) => setProp("headerAlign", e.target.value)}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LocalizedBlockInput block={block} field="headerCtaLabel" label="Header CTA label" />
          <div>
            <Label className="text-xs">Header CTA href</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={cfg.headerCtaHref}
              onChange={(e) => setProp("headerCtaHref", e.target.value)}
            />
          </div>
        </div>
        <IconNameSelect
          value={cfg.headerIcon}
          onChange={(headerIcon) => setProp("headerIcon", headerIcon)}
        />
        <UrlPrimaryMediaPickerField
          label="Header image (optional)"
          mediaTypes={["IMAGE", "SVG"]}
          url={cfg.headerImageUrl}
          onPick={({ url, mediaId }) =>
            onChange(
              patchBlockSettings(block, {
                headerImageUrl: url,
                headerMediaAssetId: mediaId ?? "",
              })
            )
          }
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.showCategories}
            onChange={(e) => setProp("showCategories", e.target.checked)}
          />
          Show category filters
        </label>

        <ModalRepeatableListEditor
          items={items}
          onChange={updateItems}
          createEmpty={emptyFeatureGridItem}
          strings={{
            sectionLabel: "Cards",
            addButtonLabel: "Add card",
            emptyLabel: "No cards yet. Click Add card to create one.",
            dialogTitleCreate: "Add card",
            dialogTitleEdit: "Edit card",
            saveButtonLabelCreate: "Save card",
            saveButtonLabelEdit: "Save card",
          }}
          renderSummary={(item) => {
            const localizedValues = item as unknown as Record<string, string>;
            const title =
              readItemFieldValue(localizedValues, "title", activeCode).trim() || "Untitled card";
            const category = readItemFieldValue(localizedValues, "category", activeCode).trim();
            const badge = readItemFieldValue(localizedValues, "badge", activeCode).trim();
            return {
              title,
              meta: [
                ...(badge ? [`Badge: ${badge}`] : []),
                ...(category ? [`Category: ${category}`] : []),
                ...(item.href?.trim() ? [`Link: ${item.href}`] : []),
              ],
            };
          }}
          renderForm={(draft, onUpdate) => (
            <FeatureGridCardForm item={draft} onUpdate={onUpdate} />
          )}
        />
      </Section>

      <Section title="02 Layout" open={openLayout} onToggle={() => setOpenLayout((v) => !v)}>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.layout}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="standard">Standard card grid</option>
            <option value="icon">Icon / image cards</option>
            <option value="numbered">Numbered service cards</option>
            <option value="horizontal">Horizontal cards</option>
            <option value="carousel">Carousel / horizontal scroll</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Desktop cols</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={String(cfg.columns)}
              onChange={(e) => setProp("columns", Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tablet cols</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={String(cfg.columnsTablet)}
              onChange={(e) => setProp("columnsTablet", Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Mobile cols</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={String(cfg.columnsMobile)}
              onChange={(e) => setProp("columnsMobile", Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Gap (px)</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-sm"
            value={cfg.gap}
            onChange={(e) => setProp("gap", Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs">Content alignment</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.contentAlign}
            onChange={(e) => setProp("contentAlign", e.target.value)}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.equalHeight}
            onChange={(e) => setProp("equalHeight", e.target.checked)}
          />
          Equal-height cards
        </label>
        <div>
          <Label className="text-xs">Min card height (px)</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-sm"
            value={cfg.minCardHeight}
            onChange={(e) => setProp("minCardHeight", Number(e.target.value))}
          />
        </div>
      </Section>

      <Section title="03 Card design" open={openDesign} onToggle={() => setOpenDesign((v) => !v)}>
        <div>
          <Label className="text-xs">Card style</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.cardStyle}
            onChange={(e) => setProp("cardStyle", e.target.value)}
          >
            <option value="solid">Solid</option>
            <option value="outlined">Outlined</option>
            <option value="elevated">Elevated</option>
            <option value="minimal">Minimal</option>
            <option value="glass">Glass</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Hover effect</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.cardHoverEffect}
            onChange={(e) => setProp("cardHoverEffect", e.target.value)}
          >
            <option value="none">None</option>
            <option value="lift">Lift</option>
            <option value="border">Border</option>
            <option value="shadow">Shadow</option>
            <option value="background">Background</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["cardBackgroundColor", "Background"],
              ["cardTextColor", "Text"],
              ["cardBorderColor", "Border"],
              ["cardAccentColor", "Accent"],
              ["cardBorderRadius", "Radius"],
              ["cardPadding", "Padding"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="CSS value"
                value={(cfg[key] as string) ?? ""}
                onChange={(e) => setProp(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Icon size (px)</Label>
            <Input
              type="number"
              className="mt-1 h-8 text-sm"
              value={cfg.iconSize}
              onChange={(e) => setProp("iconSize", Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Icon shape</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={cfg.iconShape}
              onChange={(e) => setProp("iconShape", e.target.value)}
            >
              <option value="circle">Circle</option>
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
            </select>
          </div>
        </div>
      </Section>

      <Section
        title="04 Read more & interactions"
        open={openExpand}
        onToggle={() => setOpenExpand((v) => !v)}
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.expandEnabled}
            onChange={(e) => setProp("expandEnabled", e.target.checked)}
          />
          Enable expandable content
        </label>
        <div>
          <Label className="text-xs">Expand mode</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.expandMode}
            onChange={(e) => setProp("expandMode", e.target.value)}
          >
            <option value="inline">Inline</option>
            <option value="modal">Modal</option>
            <option value="drawer">Drawer</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Preview by</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={cfg.previewBy}
              onChange={(e) => setProp("previewBy", e.target.value)}
            >
              <option value="lines">Lines</option>
              <option value="words">Words</option>
              <option value="characters">Characters</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Preview limit</Label>
            <Input
              type="number"
              className="mt-1 h-8 text-sm"
              value={cfg.previewLimit}
              onChange={(e) => setProp("previewLimit", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LocalizedBlockInput block={block} field="readMoreLabel" label="Read more label" />
          <LocalizedBlockInput block={block} field="readLessLabel" label="Read less label" />
        </div>
        <div>
          <Label className="text-xs">Read more button style</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={cfg.readMoreStyle}
            onChange={(e) => setProp("readMoreStyle", e.target.value)}
          >
            <option value="text">Text link</option>
            <option value="outlined">Outlined</option>
            <option value="filled">Filled</option>
          </select>
        </div>
      </Section>
    </div>
  );
}
