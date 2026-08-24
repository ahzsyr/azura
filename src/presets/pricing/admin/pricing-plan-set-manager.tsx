"use client";

import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";

import Link from "next/link";
import { DollarSign, GripVertical } from "lucide-react";
import { useState, useTransition } from "react";
import type { PricingPlanSetAdmin } from "@/presets/pricing/types";
import {
  deletePricingPlanSet,
  reorderPricingPlanSets,
  togglePricingPlanSetPublished,
} from "@/presets/pricing/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = { sets: PricingPlanSetAdmin[] };

export function PricingPlanSetManager({ sets: initialSets }: Props) {
  const [sets, setSets] = useState(initialSets);
  const [pending, startTransition] = useTransition();

  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Pricing Plans"
        description="Manage pricing tables and comparison features."
        actions={
          <Button asChild>
            <Link href="/admin/pricing-plans/new">Add pricing set</Link>
          </Button>
        }
      />

      {sets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No pricing sets yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/pricing-plans/new">Add pricing set</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {sets.map((set) => (
            <div key={set.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <DollarSign className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(set, 'title', 'en')}</h3>
                    {!set.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{set.slug} · {set.planCount} plan{set.planCount === 1 ? "" : "s"} · {set.featureCount}{" "}
                    feature{set.featureCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/pricing-plans/${set.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await togglePricingPlanSetPublished(set.id, !set.isPublished);
                        refresh();
                      })
                    }
                  >
                    {set.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(set, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deletePricingPlanSet(set.id);
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
