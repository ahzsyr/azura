"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PricingCalculator, PricingCalculatorField, PricingCalculatorRule } from "@prisma/client";
import { togglePricingCalculatorPublished } from "@/features/pricing-calculators/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { PricingCalculatorForm } from "./pricing-calculator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingCalculatorEditPage({
  calculator,
  displayTitle,
}: {
  calculator: PricingCalculator & { fields: PricingCalculatorField[]; rules: PricingCalculatorRule[] };
  displayTitle: string;
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
          await togglePricingCalculatorPublished(calculator.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${displayTitle}`}
        description={`/${calculator.slug} · ${calculator.fields.length} fields · ${calculator.rules.length} rules`}
        actions={!calculator.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingCalculatorForm calculator={calculator} mode="edit" embedded formRef={formRef} />
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
