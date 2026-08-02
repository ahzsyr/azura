import { useState } from "react";
import { MediaPicker } from "@/features/catalog/admin/media/MediaPicker";

export function CollectionMediaPickers() {
  const [iconOpen, setIconOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);

  function dispatch(field: "icon" | "banner", url: string) {
    document.dispatchEvent(
      new CustomEvent("collection-media-pick", { detail: { field, url } }),
    );
  }

  return (
    <>
      <button
        id="col-icon-pick-btn"
        type="button"
        className="az-btn az-btn-o col-btn-sm"
        onClick={() => setIconOpen(true)}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2"/>
          <circle cx="8.5" cy="8.5" r="2.5"/>
          <path d="M21 15l-5-5-6 6-3-3-4 4"/>
        </svg>
        Choose Icon
      </button>
      <MediaPicker
        isOpen={iconOpen}
        onClose={() => setIconOpen(false)}
        accept={["image", "svg"]}
        title="Select Collection Icon"
        onSelect={(item) => { dispatch("icon", item.url); setIconOpen(false); }}
      />

      <button
        id="col-banner-pick-btn"
        type="button"
        className="az-btn az-btn-o col-btn-sm"
        onClick={() => setBannerOpen(true)}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2"/>
          <circle cx="8.5" cy="8.5" r="2.5"/>
          <path d="M21 15l-5-5-6 6-3-3-4 4"/>
        </svg>
        Choose Banner
      </button>
      <MediaPicker
        isOpen={bannerOpen}
        onClose={() => setBannerOpen(false)}
        accept={["image", "svg"]}
        title="Select Collection Banner"
        onSelect={(item) => { dispatch("banner", item.url); setBannerOpen(false); }}
      />
    </>
  );
}
