"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Partner, PartnerCategory, PartnerProgram } from "@prisma/client";
import { togglePartnerProgramPublished } from "@/features/partners/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PartnerProgramForm } from "./partner-program-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PartnerProgramEditPage({
  program,
}: {
  program: PartnerProgram & { categories: PartnerCategory[]; partners: Partner[] };
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
          await togglePartnerProgramPublished(program.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${program.titleEn}`}
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
