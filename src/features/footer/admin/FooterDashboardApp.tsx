"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityTranslation } from "@prisma/client";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { loadFooterWorkspaceFromServer } from "@/features/footer/footer-workspace-api";
import { loadWorkspaceFromServer } from "@/features/navigation/header-workspace-api";
import { collectFooterTranslationRefs } from "@/features/footer/footer-translation-refs";
import { $footerCanRedo, $footerCanUndo, $footerWorkspace, redoFooterWorkspace, undoFooterWorkspace } from "@/features/footer/footer-store";
import { getWorkspaceTranslationsBulkAction } from "@/features/translation/actions";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import {
  useWorkspaceTranslations,
  WorkspaceTranslationProvider,
} from "@/features/translation/workspace-translation-context";
import { FooterSectionsPanel } from "./FooterSectionsPanel";
import { FooterLayoutPanel } from "./FooterLayoutPanel";
import { FooterDesignPanel } from "./FooterDesignPanel";
import { FooterResponsivePanel } from "./FooterResponsivePanel";
import { FooterCopyrightPanel } from "./FooterCopyrightPanel";
import { FooterTemplatesPanel } from "./FooterTemplatesPanel";
import {
  FooterBuilderShell,
  FOOTER_SECTION_STORAGE_KEY,
  readSavedFooterSection,
  type FooterNavId,
} from "./footer-builder-shell";
import { FooterDirtySync, useFooterWorkspacePublish, useFooterWorkspaceSave } from "./FooterWorkspaceActions";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { Redo2, Undo2 } from "lucide-react";

function FooterUndoRedoToolbar() {
  const canUndo = useStore($footerCanUndo);
  const canRedo = useStore($footerCanRedo);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canUndo}
        onClick={() => undoFooterWorkspace()}
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canRedo}
        onClick={() => redoFooterWorkspace()}
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FooterDashboardContent() {
  const [section, setSection] = useState<FooterNavId>("sections");

  useEffect(() => {
    setSection(readSavedFooterSection());
    void loadFooterWorkspaceFromServer();
    void loadWorkspaceFromServer();
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
      description="Build footer sections, layout, and copyright for the public site."
      actions={<FooterUndoRedoToolbar />}
    >
      <FooterBuilderShell activeSection={section} onSectionChange={changeSection}>
        {(active) => {
          switch (active) {
            case "sections":
              return <FooterSectionsPanel />;
            case "layout":
              return <FooterLayoutPanel />;
            case "design":
              return <FooterDesignPanel />;
            case "responsive":
              return <FooterResponsivePanel />;
            case "copyright":
              return <FooterCopyrightPanel />;
            case "templates":
              return <FooterTemplatesPanel />;
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
  const onPublish = useFooterWorkspacePublish();
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
      <DesignHubShell title="Footer" description="Build footer sections, layout, and copyright.">
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
      <AdminFormProvider onSave={onSave} onCancel={onCancel} onPublish={onPublish}>
        <FooterDirtySync />
        <FooterTranslationDirtySync />
        <FooterDashboardContent />
      </AdminFormProvider>
    </WorkspaceTranslationProvider>
  );
}
