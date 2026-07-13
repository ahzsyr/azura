"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocPortal, DocSection, DocVersion } from "@prisma/client";
import { toggleDocPortalPublished } from "@/modules/documentation/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { DocPortalForm } from "./doc-portal-form";
import type { DocPortalFormDrafts } from "./doc-portal-form-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DocPortalEditPage({
  portal,
  displayTitle,
  formDrafts,
}: {
  portal: DocPortal & { versions: DocVersion[]; sections: DocSection[] };
  displayTitle: string;
  formDrafts?: DocPortalFormDrafts;
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
          await toggleDocPortalPublished(portal.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${displayTitle}`}
        description={`/${portal.slug} · ${portal.versions.length} versions · ${portal.sections.length} sections`}
        actions={!portal.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Doc portal</CardTitle>
        </CardHeader>
        <CardContent>
          <DocPortalForm portal={portal} formDrafts={formDrafts} mode="edit" embedded formRef={formRef} />
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
