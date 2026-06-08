"use client";

import { useCallback, useEffect, useState } from "react";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
import { loadFooterWorkspaceFromServer } from "@/features/footer/footer-workspace-api";
import { FooterColumnsPanel } from "./FooterColumnsPanel";
import { FooterLayoutPanel } from "./FooterLayoutPanel";
import { FooterCopyrightPanel } from "./FooterCopyrightPanel";
import {
  FooterBuilderShell,
  FOOTER_SECTION_STORAGE_KEY,
  readSavedFooterSection,
  type FooterNavId,
} from "./footer-builder-shell";
import { FooterDirtySync, useFooterWorkspaceSave } from "./FooterWorkspaceActions";

function FooterDashboardContent() {
  const [section, setSection] = useState<FooterNavId>("columns");

  useEffect(() => {
    setSection(readSavedFooterSection());
    void loadFooterWorkspaceFromServer();
  }, []);

  const changeSection = (next: FooterNavId) => {
    setSection(next);
    try {
      localStorage.setItem(FOOTER_SECTION_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <DesignHubShell
      title="Footer"
      description="Build footer columns, layout, and copyright for the public site."
    >
      <FooterBuilderShell activeSection={section} onSectionChange={changeSection}>
        {(active) => {
          switch (active) {
            case "columns":
              return <FooterColumnsPanel />;
            case "layout":
              return <FooterLayoutPanel />;
            case "copyright":
              return <FooterCopyrightPanel />;
            default:
              return null;
          }
        }}
      </FooterBuilderShell>
    </DesignHubShell>
  );
}

export function FooterDashboardApp() {
  const onSave = useFooterWorkspaceSave();
  const onCancel = useCallback(async () => {
    const result = await loadFooterWorkspaceFromServer();
    if (!result.ok) {
      throw new Error("Could not reload footer workspace.");
    }
  }, []);
  return (
    <AdminFormProvider onSave={onSave} onCancel={onCancel}>
      <FooterDirtySync />
      <FooterDashboardContent />
    </AdminFormProvider>
  );
}
