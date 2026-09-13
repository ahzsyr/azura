"use client";

import type { HeaderBuilderSettings } from "@/features/navigation/types";
import { setSettings } from "@/features/navigation/header-store";
import { resolveNavIconVisibility } from "@/features/navigation/nav-icon-visibility";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { OptionButtonGroup } from "./header-builder-ui";

type Props = {
  settings: HeaderBuilderSettings;
};

/** Per-breakpoint menu item icon visibility (main nav + mobile drawer). */
export function NavShowIconsSettings({ settings }: Props) {
  const visibility = resolveNavIconVisibility(settings);

  return (
    <AdminCollapsibleSection
      title="Show icons"
      description="Control menu icons per breakpoint. Mobile ≤640px, tablet 641–968px, desktop ≥969px."
      defaultOpen
    >
      <div className="space-y-2">
        <OptionButtonGroup
          value={visibility.mobile ? "icons-on" : "icons-off"}
          options={[
            { value: "icons-on", label: "Mobile on" },
            { value: "icons-off", label: "Mobile off" },
          ]}
          onChange={(v) => setSettings({ mobileNavShowIcons: v === "icons-on" })}
          columns={2}
        />
        <OptionButtonGroup
          value={visibility.tablet ? "icons-on" : "icons-off"}
          options={[
            { value: "icons-on", label: "Tablet on" },
            { value: "icons-off", label: "Tablet off" },
          ]}
          onChange={(v) => setSettings({ tabletNavShowIcons: v === "icons-on" })}
          columns={2}
        />
        <OptionButtonGroup
          value={visibility.desktop ? "icons-on" : "icons-off"}
          options={[
            { value: "icons-on", label: "Desktop on" },
            { value: "icons-off", label: "Desktop off" },
          ]}
          onChange={(v) => setSettings({ desktopNavShowIcons: v === "icons-on" })}
          columns={2}
        />
      </div>
    </AdminCollapsibleSection>
  );
}
