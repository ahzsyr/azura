"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, setFooterResponsive } from "@/features/footer/footer-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";

export function FooterResponsivePanel() {
  const workspace = useStore($footerWorkspace);
  const responsive = workspace.responsive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Responsive</CardTitle>
        <CardDescription>Column counts per breakpoint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Desktop columns</Label>
          <HeaderSelect
            value={String(responsive.desktop)}
            onChange={(v) => setFooterResponsive({ desktop: Number(v) as 2 | 3 | 4 })}
          >
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
            <option value="4">4 columns</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Tablet columns</Label>
          <HeaderSelect
            value={String(responsive.tablet)}
            onChange={(v) => setFooterResponsive({ tablet: Number(v) as 1 | 2 | 3 })}
          >
            <option value="1">1 column</option>
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Mobile columns</Label>
          <p className="text-sm text-muted-foreground">Always 1 column on mobile.</p>
        </div>
      </CardContent>
    </Card>
  );
}
