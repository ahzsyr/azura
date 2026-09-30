"use client";

import { PopupEditorHeader } from "@/features/popups/admin/PopupEditorHeader";
import {
  PopupEditorNav,
  type PopupEditorSectionId,
} from "@/features/popups/admin/PopupEditorNav";
import { PopupEditorSummaryBar } from "@/features/popups/admin/PopupEditorSummaryBar";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import { PopupAdvancedSettings } from "@/features/popups/admin/sections/PopupAdvancedSettings";
import { PopupAppearanceSettings } from "@/features/popups/admin/sections/PopupAppearanceSettings";
import { PopupBehaviorSettings } from "@/features/popups/admin/sections/PopupBehaviorSettings";
import { PopupContentSettings } from "@/features/popups/admin/sections/PopupContentSettings";
import { PopupFrequencySettings } from "@/features/popups/admin/sections/PopupFrequencySettings";
import { PopupScheduleSettings } from "@/features/popups/admin/sections/PopupScheduleSettings";
import { PopupTargetingSettings } from "@/features/popups/admin/sections/PopupTargetingSettings";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  allItems: PopupItem[];
  section: PopupEditorSectionId;
  onSectionChange: (section: PopupEditorSectionId) => void;
  onBack: () => void;
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupEditor({
  item,
  allItems,
  section,
  onSectionChange,
  onBack,
  onPatch,
}: Props) {
  return (
    <div className="popup-admin-editor">
      <PopupEditorHeader
        item={item}
        onBack={onBack}
        onNameChange={(name) => onPatch({ name })}
        onEnabledChange={(enabled) => onPatch({ enabled })}
      />
      <div className="popup-admin-editor__body">
        <PopupEditorNav active={section} onChange={onSectionChange} />
        <div className="popup-admin-editor__panel">
          {section === "content" ? (
            <PopupContentSettings item={item} onPatch={onPatch} />
          ) : null}
          {section === "appearance" ? (
            <PopupAppearanceSettings item={item} onPatch={onPatch} />
          ) : null}
          {section === "behavior" ? (
            <PopupBehaviorSettings item={item} allItems={allItems} onPatch={onPatch} />
          ) : null}
          {section === "targeting" ? (
            <PopupTargetingSettings item={item} onPatch={onPatch} />
          ) : null}
          {section === "schedule" ? (
            <PopupScheduleSettings item={item} onPatch={onPatch} />
          ) : null}
          {section === "frequency" ? (
            <PopupFrequencySettings item={item} onPatch={onPatch} />
          ) : null}
          {section === "advanced" ? (
            <PopupAdvancedSettings item={item} allItems={allItems} onPatch={onPatch} />
          ) : null}
        </div>
      </div>
      <PopupEditorSummaryBar item={item} />
    </div>
  );
}
