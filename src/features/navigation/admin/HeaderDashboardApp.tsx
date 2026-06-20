"use client";

import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { EntityTranslation } from "@prisma/client";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import { $workspace, setActiveMenuKey } from "@/features/navigation/header-store";
import { loadHeaderCatalogFromServer } from "@/features/navigation/header-catalog-api";
import { loadWorkspaceFromServer } from "@/features/navigation/header-workspace-api";
import { collectHeaderTranslationRefs } from "@/features/navigation/header-translation-refs";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { getWorkspaceTranslationsBulkAction } from "@/features/translation/actions";
import {
  useWorkspaceTranslations,
  WorkspaceTranslationProvider,
} from "@/features/translation/workspace-translation-context";
import { AdminFormProvider, useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { HeaderBuilderCatalogProvider } from "./HeaderBuilderCatalogContext";
import "./header-dashboard.css";
import { ActionsManager } from "./ActionsManager";
import { HeaderSettingsPanel } from "./ControlPanel";
import { MenuBuilder } from "./MenuBuilder";
import { MenuManagerPanel } from "./MenuManagerPanel";
import {
  HeaderBuilderShell,
  readSavedHeaderSection,
  SECTION_STORAGE_KEY,
  type DashboardNavId,
} from "./header-builder-shell";
import { HeaderDirtySync } from "./header-dirty-sync";
import { HeaderWorkspaceActions, useHeaderWorkspaceSave } from "./HeaderWorkspaceActions";

export type { DashboardNavId };

const emptyCatalog: HeaderBuilderCatalog = {
  pages: [],
  collections: [],
  brands: [],
  tags: [],
  products: [],
  posts: [],
};

function HeaderDashboardContent({ catalog }: { catalog: HeaderBuilderCatalog }) {
  const workspace = useStore($workspace);
  const [section, setSection] = useState<DashboardNavId>(() =>
    typeof window === "undefined" ? "menuEditor" : readSavedHeaderSection(),
  );

  const changeSection = (next: DashboardNavId) => {
    setSection(next);
    try {
      localStorage.setItem(SECTION_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const handleEditInBuilder = (key: string) => {
    setActiveMenuKey(key);
    changeSection("menuEditor");
  };

  return (
    <HeaderBuilderCatalogProvider catalog={catalog}>
      <HeaderDirtySync />
      <DesignHubShell
        title="Header"
        description="Build menus, mega menus, and header actions. Site identity is configured under Theme."
        actions={<HeaderWorkspaceActions />}
      >
        <HeaderBuilderShell activeSection={section} onSectionChange={changeSection}>
          {(active) => {
            switch (active) {
              case "mobile":
                return <HeaderSettingsPanel workspace={workspace} section="mobile" />;
              case "headerStyle":
                return <HeaderSettingsPanel workspace={workspace} section="headerStyle" />;
              case "headerDesktop":
                return <HeaderSettingsPanel workspace={workspace} section="headerDesktop" />;
              case "menuManager":
                return (
                  <MenuManagerPanel workspace={workspace} onEditInBuilder={handleEditInBuilder} />
                );
              case "menuEditor":
                return <MenuBuilder onSwitchToManager={() => changeSection("menuManager")} />;
              case "actions":
                return <ActionsManager />;
              default:
                return null;
            }
          }}
        </HeaderBuilderShell>
      </DesignHubShell>
    </HeaderBuilderCatalogProvider>
  );
}

function HeaderTranslationDirtySync() {
  const adminForm = useAdminFormOptional();
  const { hasPendingTranslations } = useWorkspaceTranslations();

  useEffect(() => {
    if (hasPendingTranslations) {
      adminForm?.setDirty(true);
    }
  }, [hasPendingTranslations, adminForm]);

  return null;
}

function HeaderDashboardLoading() {
  return (
    <DesignHubShell
      title="Header"
      description="Build menus, mega menus, and header actions. Site identity is configured under Theme."
    >
      <p className="text-sm text-muted-foreground">Loading header builder…</p>
    </DesignHubShell>
  );
}

export function HeaderDashboardApp() {
  const { activeLocaleCode, locales } = useAdminEditingLocale();
  const translationFlushRef = useRef<(() => Promise<void>) | null>(null);
  const adminForm = useAdminFormOptional();
  const [catalog, setCatalog] = useState<HeaderBuilderCatalog>(emptyCatalog);
  const [translationRows, setTranslationRows] = useState<EntityTranslation[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const onSave = useHeaderWorkspaceSave(translationFlushRef);
  const loadHeaderTranslations = useCallback(async () => {
    const ws = $workspace.get();
    const refs = collectHeaderTranslationRefs(ws);
    const rows = await getWorkspaceTranslationsBulkAction(refs);
    setTranslationRows(rows);
  }, []);

  const onCancel = useCallback(async () => {
    const result = await loadWorkspaceFromServer();
    if (!result.ok) {
      throw new Error("Could not reload header workspace.");
    }
    await loadHeaderTranslations();
  }, [loadHeaderTranslations]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [workspaceResult, catalogResult] = await Promise.all([
        loadWorkspaceFromServer(),
        loadHeaderCatalogFromServer(activeLocaleCode),
      ]);

      if (cancelled) return;

      if (!workspaceResult.ok) {
        setError(
          workspaceResult.unauthorized
            ? "Session expired. Please sign in again."
            : workspaceResult.notFound
              ? "Header workspace not found. Verify database connection and redeploy API routes."
              : workspaceResult.error ?? "Could not load header workspace.",
        );
        setReady(true);
        return;
      }

      await loadHeaderTranslations();
      setCatalog(catalogResult);
      initialLoadDone.current = true;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Initial workspace load only — locale switches must not reset DnD/menu state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadHeaderTranslations]);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    let cancelled = false;
    void (async () => {
      const catalogResult = await loadHeaderCatalogFromServer(activeLocaleCode);
      if (!cancelled) setCatalog(catalogResult);
      if (!cancelled) await loadHeaderTranslations();
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLocaleCode, loadHeaderTranslations]);

  const onTranslationDirty = useCallback(() => {
    adminForm?.setDirty(true);
  }, [adminForm]);

  if (!ready) {
    return <HeaderDashboardLoading />;
  }

  if (error) {
    return (
      <DesignHubShell title="Header" description="Header builder">
        <p className="text-sm text-destructive">{error}</p>
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
        <HeaderTranslationDirtySync />
        <HeaderDashboardContent catalog={catalog} />
      </AdminFormProvider>
    </WorkspaceTranslationProvider>
  );
}
