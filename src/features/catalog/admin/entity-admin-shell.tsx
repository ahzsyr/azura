"use client";

import type { ReactNode } from "react";
import {
  AdminFormProvider,
  AdminPageHeader,
} from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout, type SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

type EntityAdminShellProps = {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  tabs: SettingsRibbonTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  canPreview?: boolean;
  canPublish?: boolean;
  /** When true, child components register topbar Save/Publish (e.g. embedded SeoMetaForm). */
  suppressPageActions?: boolean;
  /** Unique Framer Motion layoutId when multiple ribbons coexist on one page. */
  layoutId?: string;
  /** When set, input/change on this form id marks the top bar as unsaved. */
  trackFormId?: string;
  children: (activeTab: string) => ReactNode;
};

export function EntityAdminShell({
  title,
  description,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  onSave,
  onCancel,
  onPreview,
  onPublish,
  canPreview,
  canPublish,
  suppressPageActions,
  layoutId,
  trackFormId,
  children,
}: EntityAdminShellProps) {
  return (
    <AdminFormProvider
      suppressPageActions={suppressPageActions}
      onSave={onSave}
      onCancel={onCancel}
      onPreview={onPreview}
      onPublish={onPublish}
      canPreview={canPreview}
      canPublish={canPublish}
      trackFormId={trackFormId}
    >
      <AdminPageHeader title={title} description={description} actions={headerActions} />
      <AdminSettingsLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        layoutId={layoutId}
      >
        {children}
      </AdminSettingsLayout>
    </AdminFormProvider>
  );
}
