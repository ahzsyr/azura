"use client";

import { useEffect, useState } from "react";
import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type TemplateOption = { id: string; name: string; category: string };

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  categoryFilter?: string;
  propKey?: string;
};

export function FormTemplatePickerField({
  block,
  onChange,
  categoryFilter,
  propKey = "templateId",
}: Props) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/form-templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, []);

  const value = (block.props[propKey] as string) ?? "";
  const filtered = categoryFilter
    ? templates.filter((t) => t.category === categoryFilter)
    : templates;

  return (
    <div>
      <Label className="text-xs">Form template</Label>
      <select
        className="w-full border rounded-md h-9 px-2 text-sm mt-1"
        value={value}
        onChange={(e) => onChange(patchBlockSettings(block, { [propKey]: e.target.value }))}
      >
        <option value="">— Select template —</option>
        {filtered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
