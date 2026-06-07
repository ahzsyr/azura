"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import {
  BLOCK_INSPECTOR_TABS,
  BLOCK_INSPECTOR_STORAGE_KEY,
  readSavedInspectorTab,
  type BlockInspectorTabId,
} from "@/features/builder/constants/block-inspector-tabs";
import { BlockStylePanel } from "@/features/builder/components/panels/block-style-panel";
import { BlockResponsivePanel } from "@/features/builder/components/panels/block-responsive-panel";
import { BlockAnimationPanel } from "@/features/builder/components/panels/block-animation-panel";
import { BlockVisibilityPanel } from "@/features/builder/components/panels/block-visibility-panel";
import { BlockStyleAdvancedPanel } from "@/features/builder/components/panels/block-style-advanced-panel";
import { BlockLookAndFeelPanel } from "@/features/builder/components/panels/block-look-and-feel-panel";

type BlockInspectorShellProps = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  content: ReactNode;
  /** URL-driven inspector tab (CMS page / content item editors). */
  activeTab?: BlockInspectorTabId;
  onTabChange?: (tab: BlockInspectorTabId) => void;
};

export function BlockInspectorShell({
  block,
  onChange,
  content,
  activeTab: controlledActiveTab,
  onTabChange,
}: BlockInspectorShellProps) {
  const [internalTab, setInternalTab] = useState<BlockInspectorTabId>(() =>
    readSavedInspectorTab()
  );
  const activeTab = controlledActiveTab ?? internalTab;

  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  const setActiveTab = (id: BlockInspectorTabId) => {
    if (controlledActiveTab === undefined) {
      setInternalTab(id);
    }
    onTabChange?.(id);
  };

  useEffect(() => {
    try {
      localStorage.setItem(BLOCK_INSPECTOR_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  return (
    <AdminSettingsLayout
      tabs={[...BLOCK_INSPECTOR_TABS]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as BlockInspectorTabId)}
      className="space-y-4"
    >
      {(tabId) => {
        switch (tabId) {
          case "content":
            return <div className="min-h-[120px]">{content}</div>;
          case "lookAndFeel":
            return <BlockLookAndFeelPanel block={block} onChange={onChange} />;
          case "style":
            return <BlockStylePanel block={block} onChange={onChange} />;
          case "responsive":
            return <BlockResponsivePanel block={block} onChange={onChange} />;
          case "animation":
            return <BlockAnimationPanel block={block} onChange={onChange} />;
          case "visibility":
            return <BlockVisibilityPanel block={block} onChange={onChange} />;
          case "advanced":
            return <BlockStyleAdvancedPanel block={block} onChange={onChange} />;
          default:
            return null;
        }
      }}
    </AdminSettingsLayout>
  );
}
