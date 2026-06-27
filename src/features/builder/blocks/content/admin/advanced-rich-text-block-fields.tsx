"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import dynamic from "next/dynamic";

const AdvancedRichTextEditor = dynamic(
  () =>
    import("@/features/builder/blocks/content/admin/advanced-rich-text-editor").then((m) => m.AdvancedRichTextEditor),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading editor…</p> }
);

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function AdvancedRichTextBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const suffix = getContentFieldSuffix(activeCode);
  const isDefault = activeCode === defaultCode;

  const contentKey = `content${suffix}`;
  const htmlKey = `html${suffix}`;
  const content = (block.props[contentKey] as string) ?? "";
  const englishContent =
    (typeof block.props.content === "string" ? block.props.content.trim() : "") ||
    (typeof block.props.contentEn === "string" ? block.props.contentEn.trim() : "") ||
    "";

  const setLocaleContent = (json: string, html: string) => {
    onChange(
      patchBlockSettings(block, {
        [contentKey]: json,
        [htmlKey]: html,
      })
    );
  };

  const label = isDefault ? "Content" : `Content (${activeLocale.label})`;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs mb-2 block">{label}</Label>
        <AdvancedRichTextEditor
          content={content}
          onChange={setLocaleContent}
          placeholder={
            !isDefault && !content.trim() && englishContent.trim()
              ? `Shows English on site if empty: ${englishContent.slice(0, 80)}${englishContent.length > 80 ? "…" : ""}`
              : "Write content…"
          }
        />
      </div>
      <div>
        <Label className="text-xs">Max width</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.maxWidth as string) ?? "reading"}
          onChange={(e) =>
            onChange(patchBlockSettings(block, { maxWidth: e.target.value }))
          }
        >
          <option value="full">Full</option>
          <option value="contained">Contained</option>
          <option value="narrow">Narrow</option>
          <option value="reading">Reading</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.prose !== false}
          onChange={(e) =>
            onChange(patchBlockSettings(block, { prose: e.target.checked }))
          }
        />
        Apply prose styles
      </label>
    </div>
  );
}
