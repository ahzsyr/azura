"use client";

import { useEffect, useState } from "react";
import type { MediaStorageStatus } from "@/features/media/media-storage-status";

export function CatalogSiteStorageNotice() {
  const [status, setStatus] = useState<MediaStorageStatus | null>(null);

  useEffect(() => {
    fetch("/api/media/storage-status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data as MediaStorageStatus | null))
      .catch(() => setStatus(null));
  }, []);

  if (!status?.catalogSiteMessage) return null;

  const isError = !status.ready || status.catalogSiteMessage.includes("SUPABASE_SERVICE_ROLE_KEY");

  return (
    <div
      className={`mm-storage-notice${isError ? " mm-storage-notice--error" : " mm-storage-notice--info"}`}
      role="status"
    >
      {isError ? "⚠" : "ℹ"} {status.catalogSiteMessage}
    </div>
  );
}

/** User-facing delete error from API response text. */
export function formatCatalogDeleteError(message: string): string {
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return "Delete failed: Supabase Storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment and redeploy.";
  }
  if (message.includes("read-only")) {
    return "Delete failed: server filesystem is read-only. Configure Supabase Storage for Site media on this host.";
  }
  if (message.includes("cloud storage")) {
    return "Delete failed: could not remove the file from Supabase Storage. Check your Supabase bucket and service role key.";
  }
  return message;
}

/** Success feedback when delete API returns tombstoned bundled files. */
export function catalogDeleteSuccessMessage(tombstoned: boolean): string | null {
  if (!tombstoned) return null;
  return "File hidden from the media library. Bundled deployment files cannot be removed from disk on this host.";
}
