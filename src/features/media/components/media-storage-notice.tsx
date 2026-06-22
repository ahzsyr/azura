"use client";

import { useEffect, useState } from "react";
import type { MediaStorageStatus } from "@/features/media/media-storage-status";
import { AlertCircle, Cloud, HardDrive } from "lucide-react";

export function MediaStorageNotice() {
  const [status, setStatus] = useState<MediaStorageStatus | null>(null);

  useEffect(() => {
    fetch("/api/media/storage-status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data as MediaStorageStatus | null))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  if (status.ready && !status.message) {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
        {status.backend === "supabase" ? (
          <Cloud className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>
          Uploads use <strong>{status.backend === "supabase" ? "Supabase Storage" : "server disk"}</strong>
          {status.backend === "local" ? " (public/uploads). Files may be lost on redeploy until you add Supabase Storage." : "."}
        </span>
      </div>
    );
  }

  if (!status.ready && status.message) {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Media uploads are blocked until Supabase Storage is configured</p>
          <p className="text-destructive/90">{status.message}</p>
        </div>
      </div>
    );
  }

  if (status.message) {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{status.message}</span>
      </div>
    );
  }

  return null;
}
