"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityTranslation } from "@prisma/client";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { loadFooterWorkspaceFromServer } from "@/features/footer/footer-workspace-api";
import { collectFooterTranslationRefs } from "@/features/footer/footer-translation-refs";
import { $footerWorkspace } from "@/features/footer/footer-store";
import { getWorkspaceTranslationsBulkAction } from "@/features/translation/actions";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import {
  useWorkspaceTranslations,
  WorkspaceTranslationProvider,
} from "@/features/translation/workspace-translation-context";
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

function FooterTranslationDirtySync() {
  const adminForm = useAdminFormOptional();
  const { hasPendingTranslations } = useWorkspaceTranslations();

  useEffect(() => {
    if (hasPendingTranslations) {
      adminForm?.setDirty(true);
    }
  }, [hasPendingTranslations, adminForm]);

  return null;
}

export function FooterDashboardApp() {
  const { locales } = useAdminEditingLocale();
  const translationFlushRef = useRef<(() => Promise<void>) | null>(null);
  const adminForm = useAdminFormOptional();
  const [translationRows, setTranslationRows] = useState<EntityTranslation[]>([]);
  const [translationsReady, setTranslationsReady] = useState(false);

  const loadTranslations = useCallback(async () => {
    const ws = $footerWorkspace.get();
    const refs = collectFooterTranslationRefs(ws);
    const rows = await getWorkspaceTranslationsBulkAction(refs);
    setTranslationRows(rows);
    setTranslationsReady(true);
  }, []);

  useEffect(() => {
    void (async () => {
      const result = await loadFooterWorkspaceFromServer();
      if (result.ok) {
        await loadTranslations();
      } else {
        setTranslationsReady(true);
      }
    })();
  }, [loadTranslations]);

  const onSave = useFooterWorkspaceSave(translationFlushRef);
  const onCancel = useCallback(async () => {
    const result = await loadFooterWorkspaceFromServer();
    if (!result.ok) {
      throw new Error("Could not reload footer workspace.");
    }
    await loadTranslations();
  }, [loadTranslations]);

  const onTranslationDirty = useCallback(() => {
    adminForm?.setDirty(true);
  }, [adminForm]);

  if (!translationsReady) {
    return (
      <DesignHubShell title="Footer" description="Build footer columns, layout, and copyright.">
        <p className="text-sm text-muted-foreground">Loading footer builder…</p>
      </DesignHubShell>
    );
  }

  return (
    <WorkspaceTranslationProvider
      locales={locales}
      initialRows={translationRows}
      onTranslationDirty={onTranslationDirty}
      flushRef={translationFlushRef}
    >
      <AdminFormProvider onSave={onSave} onCancel={onCancel}>
        <FooterDirtySync />
        <FooterTranslationDirtySync />
        <FooterDashboardContent />
      </AdminFormProvider>
    </WorkspaceTranslationProvider>
  );
}
