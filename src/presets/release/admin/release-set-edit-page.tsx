"use client";

import { useCallback, useRef } from "react";
import type { Release, ReleaseEntry, ReleaseSet } from "@prisma/client";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { ReleaseSetForm } from "./release-set-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReleaseSetEditPage({
  releaseSet,
  displayTitle,
}: {
  releaseSet: ReleaseSet & { releases: (Release & { entries: ReleaseEntry[] })[] };
  displayTitle: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);
  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader
        title={`Edit: ${displayTitle}`}
        description={`/${releaseSet.slug}`}
        actions={!releaseSet.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Release set</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseSetForm releaseSet={releaseSet} mode="edit" embedded formRef={formRef} />
        </CardContent>
      </Card>
      <div className="flex justify-end lg:hidden">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </AdminFormProvider>
  );
}
