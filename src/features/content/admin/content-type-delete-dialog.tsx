"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getContentTypeDeleteImpact,
  deleteContentType,
  type ContentTypeDeleteImpact,
} from "@/features/content/content-type.actions";
import { contentTypeItemsHref } from "@/features/content/content-admin-paths";

type Props = {
  typeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (slug: string) => void;
};

export function ContentTypeDeleteDialog({ typeId, open, onOpenChange, onDeleted }: Props) {
  const [pending, startTransition] = useTransition();
  const [impact, setImpact] = useState<ContentTypeDeleteImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !typeId) {
      setImpact(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getContentTypeDeleteImpact(typeId)
      .then((result) => {
        if (!cancelled) setImpact(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load delete impact");
          setImpact(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, typeId]);

  const handleDelete = () => {
    if (!typeId || !impact?.canDelete) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteContentType(typeId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onDeleted?.(result.slug);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete content type</DialogTitle>
          <DialogDescription>
            {impact
              ? `Review what is linked to “${impact.label}” before removing it.`
              : "Checking linked content…"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {loading ? <p className="text-muted-foreground">Loading impact…</p> : null}

          {impact ? (
            <>
              <ul className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">{impact.liveItemCount}</span> live item
                  {impact.liveItemCount === 1 ? "" : "s"}
                </li>
                <li>
                  <span className="font-medium text-foreground">{impact.collectionCount}</span> collection
                  {impact.collectionCount === 1 ? "" : "s"}
                </li>
                {impact.softDeletedItemCount > 0 ? (
                  <li>
                    <span className="font-medium text-foreground">{impact.softDeletedItemCount}</span>{" "}
                    soft-deleted item{impact.softDeletedItemCount === 1 ? "" : "s"} (removed with the type)
                  </li>
                ) : null}
              </ul>

              {impact.sampleLiveItems.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground">Affected live items</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {impact.sampleLiveItems.map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                    {impact.liveItemCount > impact.sampleLiveItems.length ? (
                      <li>+{impact.liveItemCount - impact.sampleLiveItems.length} more</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {impact.isPreset ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  This is a preset type. It may be recreated automatically the next time built-in types are
                  ensured.
                </p>
              ) : null}

              {impact.blockReason ? (
                <p className="text-sm text-destructive" role="alert">
                  {impact.blockReason}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Deleting removes the type
                  {impact.collectionCount > 0 ? ", its collections," : ""}
                  {impact.softDeletedItemCount > 0 ? " and soft-deleted leftovers" : ""}. This cannot be
                  undone.
                </p>
              )}
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          {impact && !impact.canDelete ? (
            <Button asChild type="button">
              <Link href={contentTypeItemsHref(impact.slug)}>View items</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={pending || loading || !impact?.canDelete}
              onClick={handleDelete}
            >
              {pending ? "Deleting…" : "Delete type"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
