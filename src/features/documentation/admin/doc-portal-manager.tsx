"use client";

import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useState, useTransition } from "react";
import type { DocPortalAdmin } from "@/features/documentation/types";
import { deleteDocPortal, toggleDocPortalPublished } from "@/features/documentation/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DocPortalManager({ portals: initialPortals }: { portals: DocPortalAdmin[] }) {
  const [portals] = useState(initialPortals);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Documentation"
        description="Doc portals with versions and sections."
        actions={
          <Button asChild>
            <Link href="/admin/documentation/new">Add doc portal</Link>
          </Button>
        }
      />
      {portals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No doc portals yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/documentation/new">Add doc portal</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {portals.map((portal) => (
            <div key={portal.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(portal, 'title', 'en')}</h3>
                    {!portal.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{portal.slug} · {portal.versionCount} version{portal.versionCount === 1 ? "" : "s"} ·{" "}
                    {portal.sectionCount} section{portal.sectionCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/documentation/${portal.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleDocPortalPublished(portal.id, !portal.isPublished);
                        refresh();
                      })
                    }
                  >
                    {portal.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(portal, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deleteDocPortal(portal.id);
                        refresh();
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </AdminCardGrid>
      )}
    </div>
  );
}
