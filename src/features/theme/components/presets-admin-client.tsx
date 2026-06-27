"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PresetsAdminGrid } from "@/features/theme/components/presets-admin-grid";

export function PresetsAdminClient() {
  return (
    <DesignHubShell
      title="Presets"
      description="Browse industry presets, customize tokens, preview in an iframe, and apply to the theme draft."
    >
      <PresetsAdminGrid />
    </DesignHubShell>
  );
}
