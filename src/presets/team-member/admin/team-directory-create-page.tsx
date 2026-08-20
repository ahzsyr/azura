"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { TeamDirectoryForm } from "./team-directory-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TeamDirectoryCreatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);
  const handleCancel = useCallback(() => {
    router.push("/admin/team");
  }, [router]);

  return (
    <AdminFormProvider onSave={handleSave} onCancel={handleCancel} canCancel>
      <AdminPageHeader title="New team directory" description="Create departments and team members." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamDirectoryForm mode="create" embedded formRef={formRef} />
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
