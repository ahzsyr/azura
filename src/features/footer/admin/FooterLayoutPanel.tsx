"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, patchFooter } from "@/features/footer/footer-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";

export function FooterLayoutPanel() {
  const workspace = useStore($footerWorkspace);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Layout</CardTitle>
        <CardDescription>Overall footer structure on the public site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Layout mode</Label>
          <OptionButtonGroup
            value={workspace.layout}
            options={[
              { value: "grid", label: "Grid" },
              { value: "centered", label: "Centered" },
            ]}
            onChange={(v) => patchFooter({ layout: v })}
            columns={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
