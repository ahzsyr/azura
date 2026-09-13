"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SEO_TEMPLATES,
  type SeoTemplateType,
} from "@/features/seo/core/seo-templates";
import type { SeoAppearanceConfig } from "@/features/seo/types";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { upsertSeoAppearanceAction } from "@/features/seo/actions";

const TEMPLATE_TYPES: Array<{ id: SeoTemplateType; label: string }> = [
  { id: "home", label: "Homepage" },
  { id: "page", label: "Page" },
  { id: "product", label: "Product" },
  { id: "post", label: "Post" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "tag", label: "Tag" },
  { id: "author", label: "Author" },
  { id: "search", label: "Search" },
  { id: "404", label: "404" },
];

const VARIABLE_HINT =
  "%%title%%, %%postname%%, %%sitename%%, %%sep%%, %%tagline%%, %%excerpt%%, %%page%%, %%category%%, %%brand%%, %%author%%, %%term_title%%, %%date%%, %%search_phrase%%";

type Props = {
  initialConfig: SeoAppearanceConfig;
};

export function SearchAppearanceForm({ initialConfig }: Props) {
  const [config, setConfig] = useState<SeoAppearanceConfig>(initialConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateField(
    type: SeoTemplateType,
    field: "titleTemplate" | "descriptionTemplate",
    value: string,
  ) {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  }

  function restoreDefaults() {
    const next: SeoAppearanceConfig = {};
    for (const { id } of TEMPLATE_TYPES) {
      next[id] = { titleTemplate: DEFAULT_SEO_TEMPLATES[id] };
    }
    setConfig(next);
  }

  function save() {
    startTransition(async () => {
      const result = await runAdminAction(
        "Saving search appearance…",
        () => upsertSeoAppearanceAction(config),
        "Search Appearance saved.",
      );
      setMessage(result.ok ? "Search Appearance saved." : result.message);
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Search Appearance controls public HTML title and description patterns. AI autofill templates
        are separate and do not affect live metadata.
      </p>
      <p className="text-muted-foreground text-xs">Variables: {VARIABLE_HINT}</p>
      <div className="space-y-4">
        {TEMPLATE_TYPES.map(({ id, label }) => (
          <div key={id} className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-sm">{label}</h3>
            <div className="space-y-2">
              <Label htmlFor={`${id}-title`}>Title pattern</Label>
              <Input
                id={`${id}-title`}
                value={config[id]?.titleTemplate ?? DEFAULT_SEO_TEMPLATES[id]}
                onChange={(e) => updateField(id, "titleTemplate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-description`}>Description pattern (optional)</Label>
              <Input
                id={`${id}-description`}
                value={config[id]?.descriptionTemplate ?? ""}
                onChange={(e) => updateField(id, "descriptionTemplate", e.target.value)}
                placeholder="Leave empty to omit when no explicit description"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save Search Appearance"}
        </Button>
        <Button type="button" variant="outline" onClick={restoreDefaults} disabled={pending}>
          Restore defaults
        </Button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
