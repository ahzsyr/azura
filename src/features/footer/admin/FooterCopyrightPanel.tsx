"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, setFooterCopyright } from "@/features/footer/footer-store";
import { saveFooterWorkspaceToServer } from "@/features/footer/footer-workspace-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

export function FooterCopyrightPanel() {
  const workspace = useStore($footerWorkspace);
  const copyright = workspace.copyright ?? {};
  const persist = () => void saveFooterWorkspaceToServer();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Copyright bar</CardTitle>
        <CardDescription>Bottom bar text and optional legal links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={copyright.showBar !== false}
            onChange={(e) => {
              setFooterCopyright({ showBar: e.target.checked });
              persist();
            }}
          />
          Show copyright bar
        </label>
        <div className="space-y-2">
          <Label>Rights text</Label>
          <Input
            value={copyright.rightsText ?? ""}
            placeholder="All rights reserved."
            onChange={(e) => setFooterCopyright({ rightsText: e.target.value })}
            onBlur={persist}
          />
        </div>
        <div className="space-y-2">
          <Label>Suffix (optional)</Label>
          <Input
            value={copyright.suffix ?? ""}
            onChange={(e) => setFooterCopyright({ suffix: e.target.value })}
            onBlur={persist}
          />
        </div>
      </CardContent>
      <div className="px-6 pb-6">
        <LocaleTabPanel
          entityType="Footer"
          entityId="default"
          sourceData={{
            copyrightText: copyright.rightsText ?? "",
            tagline: copyright.suffix ?? "",
          }}
        />
      </div>
    </Card>
  );
}
