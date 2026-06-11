"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatusBoard, StatusIncident, StatusMaintenance, StatusService } from "@prisma/client";
import { toggleStatusBoardPublished } from "@/features/status/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { StatusBoardForm } from "./status-board-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatusBoardEditPage({
  board,
}: {
  board: StatusBoard & {
    services: StatusService[];
    incidents: StatusIncident[];
    maintenance: StatusMaintenance[];
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishing, startPublish] = useTransition();
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <AdminFormProvider
      onSave={handleSave}
      onPublish={() =>
        startPublish(async () => {
          await toggleStatusBoardPublished(board.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${board.titleEn}`}
        description={`/${board.slug} · ${board.services.length} services · ${board.incidents.length} incidents`}
        actions={!board.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Status board</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBoardForm board={board} mode="edit" embedded formRef={formRef} />
        </CardContent>
      </Card>
      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </div>
    </AdminFormProvider>
  );
}
