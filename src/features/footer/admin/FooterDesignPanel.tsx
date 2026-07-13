"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace, setFooterDesign } from "@/features/footer/footer-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "@/features/navigation/admin/header-builder-ui";

export function FooterDesignPanel() {
  const workspace = useStore($footerWorkspace);
  const design = workspace.design ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Design</CardTitle>
        <CardDescription>Semantic styling tokens for the public footer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Link style</Label>
          <HeaderSelect
            value={design.linkStyle ?? "muted"}
            onChange={(v) => setFooterDesign({ linkStyle: v as "default" | "muted" | "underline" })}
          >
            <option value="default">Default</option>
            <option value="muted">Muted</option>
            <option value="underline">Underline</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Heading style</Label>
          <HeaderSelect
            value={design.headingStyle ?? "uppercase"}
            onChange={(v) => setFooterDesign({ headingStyle: v as "uppercase" | "normal" })}
          >
            <option value="uppercase">Uppercase</option>
            <option value="normal">Normal</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Column gap</Label>
          <HeaderSelect
            value={design.columnGap ?? "normal"}
            onChange={(v) => setFooterDesign({ columnGap: v as "tight" | "normal" | "loose" })}
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Border style</Label>
          <HeaderSelect
            value={design.borderStyle ?? "subtle"}
            onChange={(v) => setFooterDesign({ borderStyle: v as "subtle" | "accent" | "none" })}
          >
            <option value="subtle">Subtle</option>
            <option value="accent">Accent</option>
            <option value="none">None</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Background</Label>
          <HeaderSelect
            value={design.background ?? "inherit"}
            onChange={(v) =>
              setFooterDesign({ background: v as "light" | "dark" | "accent" | "inherit" })
            }
          >
            <option value="inherit">Inherit (dark)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="accent">Accent</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Padding</Label>
          <HeaderSelect
            value={design.padding ?? "medium"}
            onChange={(v) => setFooterDesign({ padding: v as "small" | "medium" | "large" })}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Divider</Label>
          <HeaderSelect
            value={design.divider ?? "top"}
            onChange={(v) => setFooterDesign({ divider: v as "none" | "top" | "full" })}
          >
            <option value="none">None</option>
            <option value="top">Top</option>
            <option value="full">Full border</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Container width</Label>
          <HeaderSelect
            value={design.containerWidth ?? "default"}
            onChange={(v) =>
              setFooterDesign({ containerWidth: v as "default" | "narrow" | "full" })
            }
          >
            <option value="default">Default</option>
            <option value="narrow">Narrow</option>
            <option value="full">Full width</option>
          </HeaderSelect>
        </div>
        <div className="space-y-2">
          <Label>Alignment</Label>
          <HeaderSelect
            value={design.alignment ?? "start"}
            onChange={(v) => setFooterDesign({ alignment: v as "start" | "center" | "end" })}
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
          </HeaderSelect>
        </div>
      </CardContent>
    </Card>
  );
}
