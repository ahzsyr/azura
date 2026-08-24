"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PricingPlanSetForm } from "./pricing-plan-set-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingPlanSetCreatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);
  const handleCancel = useCallback(() => {
    router.push("/admin/pricing-plans");
  }, [router]);

  return (
    <AdminFormProvider onSave={handleSave} onCancel={handleCancel} canCancel>
      <AdminPageHeader title="New pricing set" description="Create a pricing table with plans and feature rows." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingPlanSetForm mode="create" embedded formRef={formRef} />
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
