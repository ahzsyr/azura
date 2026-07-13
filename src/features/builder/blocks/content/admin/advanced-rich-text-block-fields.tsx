"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const AdvancedRichTextEditor = dynamic(
  () =>
    import("@/features/builder/blocks/content/admin/advanced-rich-text-editor").then(
      (m) => m.AdvancedRichTextEditor
    ),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading editor…</p> }
);

type RichTextSection = {
  id: string;
  [key: string]: string;
};

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

function getLegacySections(props: Record<string, unknown>): RichTextSection[] {
  const hasLegacy =
    typeof props.content === "string" ||
    typeof props.contentEn === "string" ||
    typeof props.html === "string" ||
    typeof props.htmlEn === "string";

  if (!hasLegacy) return [];

  return [
    {
      id: "legacy",
      ...(typeof props.content === "string" ? { content: props.content } : {}),
      ...(typeof props.contentEn === "string" ? { contentEn: props.contentEn } : {}),
      ...(typeof props.contentAr === "string" ? { contentAr: props.contentAr } : {}),
      ...(typeof props.html === "string" ? { html: props.html } : {}),
      ...(typeof props.htmlEn === "string" ? { htmlEn: props.htmlEn } : {}),
      ...(typeof props.htmlAr === "string" ? { htmlAr: props.htmlAr } : {}),
    },
  ];
}

function getSections(props: Record<string, unknown>): RichTextSection[] {
  const raw = props.sections;
  if (Array.isArray(raw) && raw.length > 0) return raw as RichTextSection[];
  return getLegacySections(props);
}

export function AdvancedRichTextBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const suffix = getContentFieldSuffix(activeCode);
  const isDefault = activeCode === defaultCode;

  const blockRef = useRef(block);
  blockRef.current = block;

  const sections = getSections(block.props);

  const setSections = useCallback(
    (next: RichTextSection[]) => {
      onChange(patchBlockSettings(blockRef.current, { sections: next }));
    },
    [onChange]
  );

  const addSection = () => {
    setSections([...sections, { id: newId("rts") }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSections(next);
  };

  const updateSectionContent = useCallback(
    (sectionId: string, contentKey: string, htmlKey: string, json: string, html: string) => {
      const current = getSections(blockRef.current.props);
      const next = current.map((s) =>
        s.id === sectionId ? { ...s, [contentKey]: json, [htmlKey]: html } : s
      );
      onChange(patchBlockSettings(blockRef.current, { sections: next }));
    },
    [onChange]
  );

  const contentKey = `content${suffix}`;
  const htmlKey = `html${suffix}`;
  const label = isDefault ? "Content" : `Content (${activeLocale.label})`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          {sections.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {sections.length} section{sections.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {sections.map((section, index) => {
          const defaultSuffix = getContentFieldSuffix(defaultCode);
          const defaultContentKey = `content${defaultSuffix}`;

          const sectionContent = (section[contentKey] as string) ?? "";
          const englishContent =
            (typeof section.content === "string" ? section.content.trim() : "") ||
            (typeof section[defaultContentKey] === "string" ? (section[defaultContentKey] as string).trim() : "") ||
            "";

          const handleChange = (json: string, html: string) => {
            updateSectionContent(section.id, contentKey, htmlKey, json, html);
          };

          return (
            <div key={section.id} className="rounded-md border bg-card overflow-hidden">
              {sections.length > 1 && (
                <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Section {index + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={index === 0}
                      onClick={() => moveSection(section.id, -1)}
                      aria-label="Move section up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={index === sections.length - 1}
                      onClick={() => moveSection(section.id, 1)}
                      aria-label="Move section down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeSection(section.id)}
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <AdvancedRichTextEditor
                content={sectionContent}
                onChange={handleChange}
                placeholder={
                  !isDefault && !sectionContent.trim() && englishContent.trim()
                    ? `Shows English on site if empty: ${englishContent.slice(0, 80)}${englishContent.length > 80 ? "…" : ""}`
                    : index === 0
                    ? "Write content…"
                    : `Section ${index + 1}…`
                }
              />
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={addSection}
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </Button>
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
