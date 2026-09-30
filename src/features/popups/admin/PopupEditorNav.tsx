"use client";

import { cn } from "@/lib/utils";

export const POPUP_EDITOR_SECTIONS = [
  { id: "content", label: "Content" },
  { id: "appearance", label: "Appearance" },
  { id: "behavior", label: "Behavior" },
  { id: "targeting", label: "Targeting" },
  { id: "schedule", label: "Schedule" },
  { id: "frequency", label: "Frequency" },
  { id: "advanced", label: "Advanced" },
] as const;

export type PopupEditorSectionId = (typeof POPUP_EDITOR_SECTIONS)[number]["id"];

type Props = {
  active: PopupEditorSectionId;
  onChange: (id: PopupEditorSectionId) => void;
};

export function PopupEditorNav({ active, onChange }: Props) {
  return (
    <nav className="popup-admin-editor__nav" aria-label="Popup settings sections">
      {POPUP_EDITOR_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          className={cn(
            "popup-admin-editor__nav-item",
            active === section.id && "is-active",
          )}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
