import { useEffect, useRef } from "react";
import { MediaManagerApp } from "./MediaManagerApp";
import type { MediaItem, MediaPickerProps } from "./types";

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  accept,
  title = "Select Media",
  multi = false,
}: MediaPickerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mm-picker-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="mm-picker-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mm-picker-header">
          <span className="mm-picker-title">{title}</span>
          <button
            type="button"
            className="mm-btn mm-btn--icon mm-btn--sm"
            onClick={onClose}
            aria-label="Close"
          >×</button>
        </div>
        <div className="mm-picker-body">
          <MediaManagerApp
            pickerMode
            pickerAccept={accept}
            pickerMulti={multi}
            onPickerSelect={(item: MediaItem) => {
              onSelect(item);
              onClose();
            }}
            onPickerSelectMultiple={(items: MediaItem[]) => {
              if (onSelectMultiple) onSelectMultiple(items);
              else if (items[0]) onSelect(items[0]);
              onClose();
            }}
          />
        </div>
        <div className="mm-picker-footer">
          <button type="button" className="mm-btn mm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MediaPickerButton ─────────────────────────────────────────────────────────
// Convenience wrapper — renders a button that opens the picker on click.

import { useState } from "react";
import type { MediaType } from "./types";

interface MediaPickerButtonProps {
  onSelect: (item: MediaItem) => void;
  accept?: MediaType[];
  title?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function MediaPickerButton({
  onSelect,
  accept,
  title = "Select Media",
  label = "Select media",
  className = "",
  disabled = false,
}: MediaPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className || "mm-btn mm-btn--ghost"}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </button>
      <MediaPicker
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(item) => { onSelect(item); setOpen(false); }}
        accept={accept}
        title={title}
      />
    </>
  );
}
