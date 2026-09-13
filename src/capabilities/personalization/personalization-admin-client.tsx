"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PersonalizationAdminPanel } from "@/capabilities/personalization/personalization-admin-panel";

export function PersonalizationAdminClient() {
  return (
    <DesignHubShell
      title="Widget"
      description="Control the visitor theme switcher: visibility, logical position (RTL-aware), and which presets appear in the floating panel."
    >
      <PersonalizationAdminPanel />
    </DesignHubShell>
  );
}
