"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { ReleaseSetForm } from "./release-set-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReleaseSetCreatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);
  const handleCancel = useCallback(() => {
    router.push("/admin/releases");
  }, [router]);
  return (
    <AdminFormProvider onSave={handleSave} onCancel={handleCancel} canCancel>
      <AdminPageHeader title="New release set" description="Create a changelog collection." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseSetForm mode="create" embedded formRef={formRef} />
        </CardContent>
      </Card>
      <div className="flex justify-end lg:hidden">
        <Button onClick={handleSave}>Create</Button>
      </div>
    </AdminFormProvider>
  );
}
