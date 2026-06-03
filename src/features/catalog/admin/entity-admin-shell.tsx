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
  onPreview?: () => void;
  onPublish?: () => void;
  canPreview?: boolean;
  canPublish?: boolean;
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
  onPreview,
  onPublish,
  canPreview,
  canPublish,
  children,
}: EntityAdminShellProps) {
  return (
    <AdminFormProvider
      onSave={onSave}
      onPreview={onPreview}
      onPublish={onPublish}
      canPreview={canPreview}
      canPublish={canPublish}
    >
      <AdminPageHeader title={title} description={description} actions={headerActions} />
      <AdminSettingsLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      >
        {children}
      </AdminSettingsLayout>
    </AdminFormProvider>
  );
}
