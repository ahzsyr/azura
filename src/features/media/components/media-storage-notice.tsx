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
    if (status.backend === "local" && status.publicWholeSymlinkRisk) {
      return (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Git Deploy risk: entire public/ is symlinked</p>
            <p>
              Only <code className="text-[0.7rem]">public/uploads</code> should point to persistent
              storage. Redeploy the latest app version so{" "}
              <code className="text-[0.7rem]">ensure-uploads-symlink.mjs</code> can fix the layout.
            </p>
          </div>
        </div>
      );
    }

    if (status.backend === "local" && status.localPersistenceInsideDeploy) {
      return (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Uploads may be lost on the next Git redeploy</p>
            <p>
              Persistence path is inside the app deploy folder. Use{" "}
              <code className="text-[0.7rem]">/home/u637787491/persistent/public</code> outside the
              app root. See <code className="text-[0.7rem]">scripts/deploy/README.md</code>.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
        {status.backend === "supabase" ? (
          <Cloud className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="space-y-1">
          <span>
            Uploads use <strong>{status.backend === "supabase" ? "cloud storage" : "server disk"}</strong>
            {status.backend === "local"
              ? status.localUploadsPersistent
                ? status.localPersistenceMode === "public"
                  ? " (public/uploads → LOCAL_PUBLIC_DIR/uploads). CMS uploads persist across Git redeploys."
                  : " (public/uploads → LOCAL_UPLOADS_DIR). Files persist across redeploys."
                : " (public/uploads). Files may be lost on redeploy — set LOCAL_PUBLIC_DIR or LOCAL_UPLOADS_DIR."
              : "."}
          </span>
          {status.backend === "local" && status.resolvedUploadsDiskDir ? (
            <p className="text-emerald-800/80 dark:text-emerald-300/80">
              Write path: <code className="text-[0.65rem]">{status.resolvedUploadsDiskDir}</code>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!status.ready && status.message) {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Media uploads are blocked until cloud storage is configured</p>
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
