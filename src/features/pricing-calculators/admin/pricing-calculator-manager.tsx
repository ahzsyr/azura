"use client";

import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";

import Link from "next/link";
import { Calculator } from "lucide-react";
import { useState, useTransition } from "react";
import type { PricingCalculatorAdmin } from "@/features/pricing-calculators/types";
import {
  deletePricingCalculator,
  togglePricingCalculatorPublished,
} from "@/features/pricing-calculators/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PricingCalculatorManager({ calculators: initialCalculators }: { calculators: PricingCalculatorAdmin[] }) {
  const [calculators] = useState(initialCalculators);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Pricing calculators"
        description="Interactive pricing calculators with fields and rules."
        actions={
          <Button asChild>
            <Link href="/admin/pricing-calculators/new">Add calculator</Link>
          </Button>
        }
      />
      {calculators.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Calculator className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No calculators yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/pricing-calculators/new">Add calculator</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {calculators.map((calc) => (
            <div key={calc.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <Calculator className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(calc, 'title', 'en')}</h3>
                    {!calc.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{calc.slug} · {calc.fieldCount} field{calc.fieldCount === 1 ? "" : "s"} · {calc.ruleCount}{" "}
                    rule{calc.ruleCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/pricing-calculators/${calc.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await togglePricingCalculatorPublished(calc.id, !calc.isPublished);
                        refresh();
                      })
                    }
                  >
                    {calc.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(calc, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deletePricingCalculator(calc.id);
                        refresh();
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </AdminCardGrid>
      )}
    </div>
  );
}
