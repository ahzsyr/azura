"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PricingPlan, PricingPlanFeature, PricingPlanSet } from "@prisma/client";
import { togglePricingPlanSetPublished } from "@/features/pricing-plans/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PricingPlanSetForm } from "./pricing-plan-set-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  planSet: PricingPlanSet & { plans: PricingPlan[]; features: PricingPlanFeature[] };
};

export function PricingPlanSetEditPage({ planSet }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishing, startPublish] = useTransition();
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <AdminFormProvider
      onSave={handleSave}
      onPublish={() =>
        startPublish(async () => {
          await togglePricingPlanSetPublished(planSet.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${planSet.titleEn}`}
        description={`/${planSet.slug} · ${planSet.plans.length} plans`}
        actions={!planSet.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Pricing set</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingPlanSetForm planSet={planSet} mode="edit" embedded formRef={formRef} />
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
