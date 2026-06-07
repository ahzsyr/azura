"use client";

import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import { $workspace, setActiveMenuKey } from "@/features/navigation/header-store";
import { loadHeaderCatalogFromServer } from "@/features/navigation/header-catalog-api";
import { loadWorkspaceFromServer } from "@/features/navigation/header-workspace-api";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
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
  products: [],
  posts: [],
};

function HeaderDashboardContent({ catalog }: { catalog: HeaderBuilderCatalog }) {
  const workspace = useStore($workspace);
  const [section, setSection] = useState<DashboardNavId>("menuEditor");

  useEffect(() => {
    setSection(readSavedHeaderSection());
  }, []);

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
  const onSave = useHeaderWorkspaceSave();
  const [catalog, setCatalog] = useState<HeaderBuilderCatalog>(emptyCatalog);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [workspaceResult, catalogResult] = await Promise.all([
        loadWorkspaceFromServer(),
        loadHeaderCatalogFromServer("en"),
      ]);

      if (cancelled) return;

      if (!workspaceResult.ok) {
        setError(
          workspaceResult.unauthorized
            ? "Session expired. Please sign in again."
            : "Could not load header workspace."
        );
        setReady(true);
        return;
      }

      setCatalog(catalogResult);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    <AdminFormProvider onSave={onSave}>
      <HeaderDashboardContent catalog={catalog} />
    </AdminFormProvider>
  );
}
