"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { useState, useTransition } from "react";
import type { ReleaseSetAdmin } from "@/features/releases/types";
import { deleteReleaseSet, toggleReleaseSetPublished } from "@/features/releases/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ReleaseSetManager({ sets: initialSets }: { sets: ReleaseSetAdmin[] }) {
  const [sets] = useState(initialSets);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Release notes"
        description="Changelog sets and version entries."
        actions={
          <Button asChild>
            <Link href="/admin/releases/new">Add release set</Link>
          </Button>
        }
      />
      {sets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Rocket className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No release sets yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/releases/new">Add release set</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3}>
          {sets.map((set) => (
            <div key={set.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div>
                <div className="flex gap-2 items-center">
                  <h3 className="font-medium">{set.titleEn}</h3>
                  {!set.isPublished && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  /{set.slug} · {set.releaseCount} release{set.releaseCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button asChild size="sm">
                  <Link href={`/admin/releases/${set.id}`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleReleaseSetPublished(set.id, !set.isPublished);
                      refresh();
                    })
                  }
                >
                  {set.isPublished ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete "${set.titleEn}"?`)) return;
                    startTransition(async () => {
                      await deleteReleaseSet(set.id);
                      refresh();
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </AdminCardGrid>
      )}
    </div>
  );
}
