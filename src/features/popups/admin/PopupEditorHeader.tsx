"use client";

import { ArrowLeft } from "lucide-react";
import { TextField, ToggleField } from "@/components/admin/settings-fields";
import { Button } from "@/components/ui/button";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onBack: () => void;
  onNameChange: (name: string) => void;
  onEnabledChange: (enabled: boolean) => void;
};

export function PopupEditorHeader({
  item,
  onBack,
  onNameChange,
  onEnabledChange,
}: Props) {
  return (
    <header className="popup-admin-editor__header">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Popups
      </Button>
      <div className="popup-admin-editor__header-main">
        <TextField label="Name" value={item.name} onChange={onNameChange} />
      </div>
      <ToggleField
        label="Active"
        checked={item.enabled}
        onChange={onEnabledChange}
      />
    </header>
  );
}
