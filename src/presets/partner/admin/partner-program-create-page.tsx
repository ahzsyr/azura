"use client";

import { useCallback, useRef } from "react";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PartnerProgramForm } from "./partner-program-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PartnerProgramCreatePage() {
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader title="New partner program" description="Create partner categories and listings." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnerProgramForm mode="create" embedded formRef={formRef} />
        </CardContent>
      </Card>
      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Create
        </Button>
      </div>
    </AdminFormProvider>
  );
}
