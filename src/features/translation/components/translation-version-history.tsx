"use client";

import { useState, useTransition } from "react";
import type { EntityTranslationVersion } from "@prisma/client";
import { History, RotateCcw } from "lucide-react";
import {
  listTranslationVersionsAction,
  restoreTranslationVersionAction,
} from "@/features/translation/actions";
import { Button } from "@/components/ui/button";
import { TranslationStatusBadge } from "./translation-status-badge";

type Props = {
  translationId?: string;
  onRestored?: (value: string) => void;
};

export function TranslationVersionHistory({ translationId, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<EntityTranslationVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!translationId) return null;

  const loadVersions = () => {
    if (loaded) return;
    startTransition(async () => {
      const rows = await listTranslationVersionsAction(translationId);
      setVersions(rows);
      setLoaded(true);
    });
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadVersions();
  };

  const handleRestore = (versionId: string) => {
    if (!confirm("Restore this version? Current content will be saved to history.")) return;
    startTransition(async () => {
      const row = await restoreTranslationVersionAction(translationId, versionId);
      onRestored?.(row.value);
      const rows = await listTranslationVersionsAction(translationId);
      setVersions(rows);
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleToggle}>
        <History className="h-3.5 w-3.5" />
        Version history
      </Button>
      {open ? (
        <div className="space-y-2 rounded-md border p-3">
          {pending && !loaded ? (
            <p className="text-xs text-muted-foreground">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No prior versions saved.</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-start justify-between gap-3 border-b border-muted/50 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                    <TranslationStatusBadge status={version.status} />
                  </div>
                  <p className="text-xs mt-1 line-clamp-3">{version.value}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0"
                  disabled={pending}
                  onClick={() => handleRestore(version.id)}
                >
                  <RotateCcw className="h-3 w-3 me-1" />
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
