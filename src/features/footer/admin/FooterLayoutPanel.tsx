"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, patchFooter, setFooterDesign } from "@/features/footer/footer-store";
import { saveFooterWorkspaceToServer } from "@/features/footer/footer-workspace-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OptionButtonGroup, HeaderSelect } from "@/features/navigation/admin/header-builder-ui";

export function FooterLayoutPanel() {
  const workspace = useStore($footerWorkspace);
  const persist = () => void saveFooterWorkspaceToServer();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Layout & design</CardTitle>
        <CardDescription>Grid structure and visual styling for the public footer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Layout</Label>
          <OptionButtonGroup
            value={workspace.layout}
            options={[
              { value: "grid", label: "Grid" },
              { value: "centered", label: "Centered" },
            ]}
            onChange={(v) => {
              patchFooter({ layout: v });
              persist();
            }}
            columns={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Grid columns</Label>
          <HeaderSelect
            value={String(workspace.gridColumns)}
            onChange={(v) => {
              patchFooter({ gridColumns: Number(v) as 2 | 3 | 4 });
              persist();
            }}
          >
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
            <option value="4">4 columns</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Link style</Label>
          <HeaderSelect
            value={workspace.design?.linkStyle ?? "muted"}
            onChange={(v) => {
              setFooterDesign({ linkStyle: v as "default" | "muted" | "underline" });
              persist();
            }}
          >
            <option value="default">Default</option>
            <option value="muted">Muted</option>
            <option value="underline">Underline</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Heading style</Label>
          <HeaderSelect
            value={workspace.design?.headingStyle ?? "uppercase"}
            onChange={(v) => {
              setFooterDesign({ headingStyle: v as "uppercase" | "normal" });
              persist();
            }}
          >
            <option value="uppercase">Uppercase</option>
            <option value="normal">Normal</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Column gap</Label>
          <HeaderSelect
            value={workspace.design?.columnGap ?? "normal"}
            onChange={(v) => {
              setFooterDesign({ columnGap: v as "tight" | "normal" | "loose" });
              persist();
            }}
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose</option>
          </HeaderSelect>
        </div>
      </CardContent>
    </Card>
  );
}
