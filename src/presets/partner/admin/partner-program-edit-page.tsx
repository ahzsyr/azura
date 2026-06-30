"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Partner, PartnerCategory, PartnerProgram } from "@prisma/client";
import { togglePartnerProgramPublished, patchPartnerProgramFromForm } from "@/presets/partner/actions";
import { useEntityFormPatch } from "@/hooks/use-entity-form-patch";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PartnerProgramForm } from "./partner-program-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PartnerProgramEditPage({
  program,
  displayTitle,
}: {
  program: PartnerProgram & { categories: PartnerCategory[]; partners: Partner[] };
  displayTitle: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishing, startPublish] = useTransition();
  const entityPatch = useEntityFormPatch({ formRef });

  const handleSave = useCallback(async () => {
    await patchPartnerProgramFromForm(program.id, entityPatch.getBaseline(), entityPatch.getCurrent());
    entityPatch.resetBaseline();
    router.refresh();
    return true;
  }, [entityPatch, program.id, router]);

  return (
    <AdminFormProvider
      onSave={handleSave}
      getBaseline={entityPatch.getBaseline}
      getCurrent={entityPatch.getCurrent}
      patchSyncKey={program.updatedAt}
      onPublish={() =>
        startPublish(async () => {
          await togglePartnerProgramPublished(program.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${displayTitle}`}
        description={`/${program.slug} · ${program.categories.length} categories · ${program.partners.length} partners`}
        actions={!program.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Partner program</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnerProgramForm program={program} mode="edit" embedded formRef={formRef} />
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
