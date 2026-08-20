"use client";

import { UnifiedMediaPickerDialog } from "@/features/media/components/unified-media-picker-dialog";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";

export function CollectionMediaPickers() {
  function dispatch(field: "icon" | "banner", url: string) {
    document.dispatchEvent(
      new CustomEvent("collection-media-pick", { detail: { field, url } }),
    );
  }

  return (
    <>
      <UnifiedMediaPickerDialog
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        defaultSource="cms"
        onSelect={(result) => dispatch("icon", result.url)}
        trigger={
          <button
            id="col-icon-pick-btn"
            type="button"
            className="az-btn az-btn-o col-btn-sm"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
              <circle cx="8.5" cy="8.5" r="2.5"/>
              <path d="M21 15l-5-5-6 6-3-3-4 4"/>
            </svg>
            Choose Icon
          </button>
        }
      />

      <UnifiedMediaPickerDialog
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        defaultSource="cms"
        onSelect={(result) => dispatch("banner", result.url)}
        trigger={
          <button
            id="col-banner-pick-btn"
            type="button"
            className="az-btn az-btn-o col-btn-sm"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
              <circle cx="8.5" cy="8.5" r="2.5"/>
              <path d="M21 15l-5-5-6 6-3-3-4 4"/>
            </svg>
            Choose Banner
          </button>
        }
      />
    </>
  );
}
