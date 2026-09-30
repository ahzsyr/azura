"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { DocPortalForm } from "./doc-portal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DocPortalCreatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);
  const handleCancel = useCallback(() => {
    router.push("/admin/documentation");
  }, [router]);

  return (
    <AdminFormProvider onSave={handleSave} onCancel={handleCancel} canCancel>
      <AdminPageHeader title="New doc portal" description="Create documentation versions and sections." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DocPortalForm mode="create" embedded formRef={formRef} />
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
