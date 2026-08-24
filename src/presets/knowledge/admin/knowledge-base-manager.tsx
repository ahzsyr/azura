"use client";

import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useState, useTransition } from "react";
import type { KnowledgeBaseAdmin } from "@/presets/knowledge/types";
import { deleteKnowledgeBase, toggleKnowledgeBasePublished } from "@/presets/knowledge/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function KnowledgeBaseManager({ bases: initialBases }: { bases: KnowledgeBaseAdmin[] }) {
  const [bases] = useState(initialBases);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Knowledge base"
        description="Help center categories and articles."
        actions={
          <Button asChild>
            <Link href="/admin/knowledge-base/new">Add knowledge base</Link>
          </Button>
        }
      />
      {bases.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No knowledge bases yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/knowledge-base/new">Add knowledge base</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {bases.map((base) => (
            <div key={base.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(base, 'title', 'en')}</h3>
                    {!base.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{base.slug} · {base.categoryCount} categor{base.categoryCount === 1 ? "y" : "ies"} ·{" "}
                    {base.articleCount} article{base.articleCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/knowledge-base/${base.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleKnowledgeBasePublished(base.id, !base.isPublished);
                        refresh();
                      })
                    }
                  >
                    {base.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(base, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deleteKnowledgeBase(base.id);
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
