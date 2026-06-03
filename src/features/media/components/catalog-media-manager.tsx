"use client";

import { MediaManagerApp } from "@/features/catalog/admin/media/MediaManagerApp";

export function CatalogMediaManager() {
  return (
    <div className="mm-admin-embed min-h-[min(70vh,720px)]">
      <MediaManagerApp />
    </div>
  );
}
