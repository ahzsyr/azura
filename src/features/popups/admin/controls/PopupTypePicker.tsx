"use client";

import { LayoutTemplate, PanelRight, MessageSquare, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopupType } from "@/features/popups/popup.schema";

const TYPES: Array<{
  value: PopupType;
  label: string;
  description: string;
  icon: typeof LayoutTemplate;
}> = [
  {
    value: "modal",
    label: "Modal",
    description: "Centered popup",
    icon: LayoutTemplate,
  },
  {
    value: "slideIn",
    label: "Slide In",
    description: "Edge panel",
    icon: PanelRight,
  },
  {
    value: "promo",
    label: "Promo",
    description: "Announcement",
    icon: MessageSquare,
  },
  {
    value: "floatingButton",
    label: "Floating Button",
    description: "Persistent CTA",
    icon: CircleDot,
  },
];

type Props = {
  value: PopupType;
  onChange: (type: PopupType) => void;
};

export function PopupTypePicker({ value, onChange }: Props) {
  return (
    <div className="popup-admin-type-grid" role="listbox" aria-label="Popup type">
      {TYPES.map((entry) => {
        const Icon = entry.icon;
        const selected = value === entry.value;
        return (
          <button
            key={entry.value}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn("popup-admin-type-card", selected && "is-selected")}
            onClick={() => onChange(entry.value)}
          >
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="popup-admin-type-card__label">{entry.label}</span>
            <span className="popup-admin-type-card__desc">{entry.description}</span>
          </button>
        );
      })}
    </div>
  );
}
