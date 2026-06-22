"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatusBoard, StatusIncident, StatusMaintenance, StatusService } from "@prisma/client";
import { toggleStatusBoardPublished, patchStatusBoardFromForm } from "@/modules/status-page/actions";
import { useEntityFormPatch } from "@/hooks/use-entity-form-patch";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { StatusBoardForm } from "./status-board-form";
import type { StatusBoardFormDrafts } from "./status-board-form-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatusBoardEditPage({
  board,
  displayTitle,
  formDrafts,
}: {
  board: StatusBoard & {
    services: StatusService[];
    incidents: StatusIncident[];
    maintenance: StatusMaintenance[];
  };
  displayTitle: string;
  formDrafts: StatusBoardFormDrafts;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishing, startPublish] = useTransition();
  const entityPatch = useEntityFormPatch({ formRef });

  const handleSave = useCallback(async () => {
    await patchStatusBoardFromForm(board.id, entityPatch.getBaseline(), entityPatch.getCurrent());
    entityPatch.resetBaseline();
    router.refresh();
    return true;
  }, [board.id, entityPatch, router]);

  return (
    <AdminFormProvider
      onSave={handleSave}
      getBaseline={entityPatch.getBaseline}
      getCurrent={entityPatch.getCurrent}
      patchSyncKey={board.updatedAt}
      onPublish={() =>
        startPublish(async () => {
          await toggleStatusBoardPublished(board.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${displayTitle}`}
        description={`/${board.slug} · ${board.services.length} services · ${board.incidents.length} incidents`}
        actions={!board.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Status board</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBoardForm board={board} formDrafts={formDrafts} mode="edit" embedded formRef={formRef} />
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
