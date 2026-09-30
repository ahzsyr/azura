"use client";

import { buildFooterWorkspaceFromTemplate, FOOTER_WORKSPACE_TEMPLATES } from "@/features/footer/footer-workspace-templates";
import { applyFooterTemplateWorkspace } from "@/features/footer/footer-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FooterTemplatesPanel() {
  const loadTemplate = (id: string) => {
    const template = FOOTER_WORKSPACE_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    if (
      !confirm(
        `Load the "${template.label}" footer template? This replaces all current sections and cannot be undone without Cancel.`,
      )
    ) {
      return;
    }
    applyFooterTemplateWorkspace(buildFooterWorkspaceFromTemplate(template));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Footer templates</CardTitle>
        <CardDescription>
          Whole-workspace presets composed from section defaults. Overrides apply only where specified.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FOOTER_WORKSPACE_TEMPLATES.map((template) => (
            <li
              key={template.id}
              className="flex flex-col justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{template.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {template.sections.map((s) => s.type).join(" · ")}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => loadTemplate(template.id)}>
                Load template
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
