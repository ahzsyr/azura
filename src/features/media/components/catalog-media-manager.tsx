"use client";

import { MediaManagerApp } from "@/features/catalog/admin/media/MediaManagerApp";
import { CatalogSiteStorageNotice } from "@/features/media/components/catalog-site-storage-notice";

export function CatalogMediaManager() {
  return (
    <div className="mm-admin-embed min-h-[min(70vh,720px)]">
      <CatalogSiteStorageNotice />
      <MediaManagerApp />
    </div>
  );
}
