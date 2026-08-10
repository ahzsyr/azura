"use client";

import { useState } from "react";
import type { PageBlocks } from "@/types/builder";
import { BUILTIN_PAGE_TEMPLATES } from "@/features/builder/constants";
import { BlockPreviewRenderer } from "./block-preview-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Eye, LayoutTemplate } from "lucide-react";

type TemplateEntry = {
  key: string;
  name: string;
  description?: string;
  blocks: PageBlocks;
};

type Props = {
  builtinTemplates?: Record<string, { name: string; description?: string; blocks: PageBlocks }>;
  customTemplates?: Record<string, { name: string; blocks: PageBlocks }>;
  onApplyTemplate: (blocks: PageBlocks) => void;
  onSaveAsTemplate?: (name: string) => void;
  savePending?: boolean;
};

const AR_LOCALE = "ar";

export function PageTemplateGallery({
  builtinTemplates = BUILTIN_PAGE_TEMPLATES,
  customTemplates = {},
  onApplyTemplate,
  onSaveAsTemplate,
  savePending,
}: Props) {
  const [previewTemplate, setPreviewTemplate] = useState<TemplateEntry | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [saveName, setSaveName] = useState("");

  const allTemplates: TemplateEntry[] = [
    ...Object.entries(builtinTemplates).map(([key, tpl]) => ({
      key,
      name: tpl.name,
      description: tpl.description,
      blocks: tpl.blocks,
    })),
    ...Object.entries(customTemplates).map(([key, tpl]) => ({
      key,
      name: tpl.name,
      description: "Custom saved template",
      blocks: tpl.blocks,
    })),
  ];

  const apply = (tpl: TemplateEntry) => {
    if (confirm(`Replace all blocks with "${tpl.name}"?`)) {
      onApplyTemplate(JSON.parse(JSON.stringify(tpl.blocks)) as PageBlocks);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allTemplates.map((tpl) => (
          <Card key={tpl.key} className="overflow-hidden flex flex-col">
            <div className="relative h-36 overflow-hidden bg-muted border-b">
              <div
                className="origin-top-left pointer-events-none"
                style={{ transform: "scale(0.32)", width: "312.5%", height: "312.5%" }}
              >
                <BlockPreviewRenderer blocks={tpl.blocks} locale="en" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                {tpl.name}
              </CardTitle>
              {tpl.description && <CardDescription>{tpl.description}</CardDescription>}
            </CardHeader>
            <CardFooter className="mt-auto flex gap-2 pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPreviewTemplate(tpl)}
              >
                <Eye className="h-3.5 w-3.5 me-1" />
                Preview
              </Button>
              <Button type="button" size="sm" className="flex-1" onClick={() => apply(tpl)}>
                Apply
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {onSaveAsTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Save as template</CardTitle>
            <CardDescription>Save the current page blocks as a reusable template.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="Template name…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <Button
                type="button"
                disabled={savePending || !saveName.trim()}
                onClick={() => {
                  onSaveAsTemplate(saveName.trim());
                  setSaveName("");
                }}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent
          className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col gap-4"
          aria-describedby={previewTemplate?.description ? "page-template-preview-description" : undefined}
        >
          {previewTemplate && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-semibold">{previewTemplate.name}</DialogTitle>
                  {previewTemplate.description && (
                    <DialogDescription id="page-template-preview-description" className="text-sm text-muted-foreground">
                      {previewTemplate.description}
                    </DialogDescription>
                  )}
                </div>
                <div className="flex rounded-md border p-0.5 text-xs shrink-0">
                  <button
                    type="button"
                    className={cn("rounded px-2 py-0.5", previewLocale === "en" && "bg-primary text-primary-foreground")}
                    onClick={() => setPreviewLocale("en")}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    className={cn("rounded px-2 py-0.5", previewLocale === AR_LOCALE && "bg-primary text-primary-foreground")}
                    onClick={() => setPreviewLocale(AR_LOCALE)}
                  >
                    AR
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto rounded-lg border max-h-[50vh]">
                <BlockPreviewRenderer blocks={previewTemplate.blocks} locale={previewLocale} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    apply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                >
                  Apply template
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
