"use client";

import { buildEditorSummary } from "@/features/popups/admin/lib/popup-summaries";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
};

export function PopupEditorSummaryBar({ item }: Props) {
  return (
    <div className="popup-admin-editor__summary" role="status">
      <span className="truncate text-sm">{buildEditorSummary(item)}</span>
    </div>
  );
}
