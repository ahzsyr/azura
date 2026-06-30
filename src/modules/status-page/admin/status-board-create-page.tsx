"use client";

import { useCallback, useRef } from "react";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { StatusBoardForm } from "./status-board-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatusBoardCreatePage() {
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader title="New status board" description="Create services, incidents, and maintenance windows." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBoardForm mode="create" embedded formRef={formRef} />
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
