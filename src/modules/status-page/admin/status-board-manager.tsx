"use client";

import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";

import Link from "next/link";
import { Activity } from "lucide-react";
import { useState, useTransition } from "react";
import type { StatusBoardAdmin } from "@/modules/status-page/types";
import { deleteStatusBoard, toggleStatusBoardPublished } from "@/modules/status-page/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StatusBoardManager({ boards: initialBoards }: { boards: StatusBoardAdmin[] }) {
  const [boards] = useState(initialBoards);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Status"
        description="Service status boards, incidents, and maintenance."
        actions={
          <Button asChild>
            <Link href="/admin/status/new">Add status board</Link>
          </Button>
        }
      />
      {boards.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No status boards yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/status/new">Add status board</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {boards.map((board) => (
            <div key={board.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <Activity className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(board, 'title', 'en')}</h3>
                    {!board.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{board.slug} · {board.serviceCount} service{board.serviceCount === 1 ? "" : "s"} ·{" "}
                    {board.incidentCount} incident{board.incidentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/status/${board.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleStatusBoardPublished(board.id, !board.isPublished);
                        refresh();
                      })
                    }
                  >
                    {board.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(board, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deleteStatusBoard(board.id);
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
