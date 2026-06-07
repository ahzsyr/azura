"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { PricingPlan, PricingPlanFeature, PricingPlanSet } from "@prisma/client";
import { upsertPricingPlanSet } from "@/features/pricing-plans/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";

type PlanSetWithChildren = PricingPlanSet & {
  plans: PricingPlan[];
  features: PricingPlanFeature[];
};

type Props = {
  planSet?: PlanSetWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

type PlanDraft = {
  id?: string;
  nameEn: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  isHighlighted: boolean;
  isPublished: boolean;
};

type FeatureDraft = { id?: string; labelEn: string; labelAr: string };

function PricingPlanCurrencyField({ defaultValue }: { defaultValue?: string | null }) {
  const { currency, activeLocale } = useAdminEditingLocale();
  return (
    <div className="space-y-2">
      <Label htmlFor="currency">Currency</Label>
      <Input
        id="currency"
        name="currency"
        defaultValue={(defaultValue ?? currency).toUpperCase()}
        maxLength={3}
        className="uppercase"
      />
      <p className="text-xs text-muted-foreground">Default from {activeLocale.label} language settings.</p>
    </div>
  );
}

export function PricingPlanSetForm({
  planSet,
  mode = planSet ? "edit" : "create",
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [plans, setPlans] = useState<PlanDraft[]>(
    planSet?.plans.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
      isHighlighted: p.isHighlighted,
      isPublished: p.isPublished,
    })) ?? []
  );
  const [features, setFeatures] = useState<FeatureDraft[]>(
    planSet?.features.map((f) => ({ id: f.id, labelEn: f.labelEn, labelAr: f.labelAr })) ?? []
  );

  useEffect(() => {
    if (!embedded || !formRef?.current || !adminForm) return;
    const form = formRef.current;
    const markDirty = () => adminForm.setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [embedded, formRef, adminForm]);

  const handleSubmit = (formData: FormData) => {
    formData.set("plansJson", JSON.stringify(plans));
    formData.set("featuresJson", JSON.stringify(features));
    startTransition(async () => {
      const saved = await upsertPricingPlanSet(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/pricing-plans/${saved.id}`);
      else {
        adminForm?.showToast("Pricing set saved", "success");
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      {planSet && <input type="hidden" name="id" value={planSet.id} />}
      <input type="hidden" name="sortOrder" value={planSet?.sortOrder ?? 0} />

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={planSet ?? undefined} required />
      <AdminLocalizedFormField fieldKey="description" label="Description" legacyEntity={planSet ?? undefined} />
      <div className="grid gap-4 md:grid-cols-2">
        <PricingPlanCurrencyField defaultValue={planSet?.currency} />
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={planSet?.slug ?? ""} placeholder="auto from title" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={planSet?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Plans</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setPlans((prev) => [
                ...prev,
                {
                  nameEn: "",
                  nameAr: "",
                  priceMonthly: 0,
                  priceYearly: 0,
                  isHighlighted: false,
                  isPublished: true,
                },
              ])
            }
          >
            Add plan
          </Button>
        </div>
        {plans.map((plan, index) => (
          <div key={plan.id ?? `new-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Name EN"
              value={plan.nameEn}
              onChange={(e) =>
                setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, nameEn: e.target.value } : p)))
              }
            />
            <Input
              placeholder="Name AR"
              dir="rtl"
              value={plan.nameAr}
              onChange={(e) =>
                setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, nameAr: e.target.value } : p)))
              }
            />
            <Input
              type="number"
              placeholder="Monthly"
              value={plan.priceMonthly}
              onChange={(e) =>
                setPlans((prev) =>
                  prev.map((p, i) => (i === index ? { ...p, priceMonthly: Number(e.target.value) } : p))
                )
              }
            />
            <Input
              type="number"
              placeholder="Yearly"
              value={plan.priceYearly}
              onChange={(e) =>
                setPlans((prev) =>
                  prev.map((p, i) => (i === index ? { ...p, priceYearly: Number(e.target.value) } : p))
                )
              }
            />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={plan.isHighlighted}
                  onChange={(e) =>
                    setPlans((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, isHighlighted: e.target.checked } : p))
                    )
                  }
                />
                Highlighted
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPlans((prev) => prev.filter((_, i) => i !== index))}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Comparison features</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFeatures((prev) => [...prev, { labelEn: "", labelAr: "" }])}
          >
            Add feature row
          </Button>
        </div>
        {features.map((feature, index) => (
          <div key={feature.id ?? `f-${index}`} className="flex flex-wrap gap-2">
            <Input
              placeholder="Label EN"
              value={feature.labelEn}
              onChange={(e) =>
                setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, labelEn: e.target.value } : f)))
              }
            />
            <Input
              placeholder="Label AR"
              dir="rtl"
              value={feature.labelAr}
              onChange={(e) =>
                setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, labelAr: e.target.value } : f)))
              }
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => setFeatures((prev) => prev.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      ) : null}
    </form>
  );
}
