"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, setFooterCopyright } from "@/features/footer/footer-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FooterCopyrightField } from "./footer-localized-fields";

export function FooterCopyrightPanel() {
  const workspace = useStore($footerWorkspace);
  const copyright = workspace.copyright ?? {};

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
            onChange={(e) => setFooterCopyright({ showBar: e.target.checked })}
          />
          Show copyright bar
        </label>
        <FooterCopyrightField
          field="copyrightText"
          label="Rights text"
          defaultValue={copyright.rightsText ?? ""}
          onDefaultChange={(rightsText) => setFooterCopyright({ rightsText })}
        />
        <FooterCopyrightField
          field="tagline"
          label="Suffix"
          defaultValue={copyright.suffix ?? ""}
          onDefaultChange={(suffix) => setFooterCopyright({ suffix })}
        />
      </CardContent>
    </Card>
  );
}
