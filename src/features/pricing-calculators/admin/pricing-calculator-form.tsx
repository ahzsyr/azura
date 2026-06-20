"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { PricingCalculator, PricingCalculatorField, PricingCalculatorRule } from "@prisma/client";
import { upsertPricingCalculator } from "@/features/pricing-calculators/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";

type CalculatorWithChildren = PricingCalculator & {
  fields: PricingCalculatorField[];
  rules: PricingCalculatorRule[];
};

type FieldDraft = {
  id?: string;
  key: string;
  labelEn: string;
  labelAr: string;
  fieldType: string;
  defaultValue: string;
};

type RuleDraft = {
  id?: string;
  fieldKey: string;
  operator: string;
  value: string;
  priceDelta: number;
  multiplier: number;
};

function PricingCalculatorCurrencyField({ defaultValue }: { defaultValue?: string | null }) {
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
      <p className="text-xs text-muted-foreground">From {activeLocale.label} language settings when empty.</p>
    </div>
  );
}

export function PricingCalculatorForm({
  calculator,
  mode = calculator ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  calculator?: CalculatorWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState<FieldDraft[]>(
    calculator?.fields.map((f) => ({
      id: f.id,
      key: f.key,
      labelEn: "",
      labelAr: "",
      fieldType: f.fieldType,
      defaultValue: f.defaultValue,
    })) ?? []
  );
  const [rules, setRules] = useState<RuleDraft[]>(
    calculator?.rules.map((r) => ({
      id: r.id,
      fieldKey: r.fieldKey,
      operator: r.operator,
      value: r.value,
      priceDelta: Number(r.priceDelta),
      multiplier: Number(r.multiplier),
    })) ?? []
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
    formData.set("fieldsJson", JSON.stringify(fields));
    formData.set("rulesJson", JSON.stringify(rules));
    startTransition(async () => {
      const saved = await upsertPricingCalculator(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/pricing-calculators/${saved.id}`);
      else {
        adminForm?.showToast("Calculator saved", "success");
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
      {calculator && <input type="hidden" name="id" value={calculator.id} />}
      <input type="hidden" name="sortOrder" value={calculator?.sortOrder ?? 0} />

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={calculator ?? undefined} required />
      <AdminLocalizedFormField fieldKey="description" label="Description" legacyEntity={calculator ?? undefined} />
      <div className="grid gap-4 md:grid-cols-3">
        <PricingCalculatorCurrencyField defaultValue={calculator?.currency} />
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base price</Label>
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            step="0.01"
            defaultValue={calculator ? Number(calculator.basePrice) : 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={calculator?.slug ?? ""} placeholder="auto from title" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={calculator?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Fields</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setFields((prev) => [
                ...prev,
                { key: "", labelEn: "", labelAr: "", fieldType: "NUMBER", defaultValue: "" },
              ])
            }
          >
            Add field
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id ?? `field-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Key"
              value={field.key}
              onChange={(e) =>
                setFields((prev) => prev.map((f, i) => (i === index ? { ...f, key: e.target.value } : f)))
              }
            />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={field.fieldType}
              onChange={(e) =>
                setFields((prev) => prev.map((f, i) => (i === index ? { ...f, fieldType: e.target.value } : f)))
              }
            >
              <option value="NUMBER">Number</option>
              <option value="SELECT">Select</option>
              <option value="TOGGLE">Toggle</option>
            </select>
            <Input
              placeholder="Label EN"
              value={field.labelEn}
              onChange={(e) =>
                setFields((prev) => prev.map((f, i) => (i === index ? { ...f, labelEn: e.target.value } : f)))
              }
            />
            <Input
              placeholder="Label AR"
              dir="rtl"
              value={field.labelAr}
              onChange={(e) =>
                setFields((prev) => prev.map((f, i) => (i === index ? { ...f, labelAr: e.target.value } : f)))
              }
            />
            <Input
              placeholder="Default value"
              value={field.defaultValue}
              onChange={(e) =>
                setFields((prev) => prev.map((f, i) => (i === index ? { ...f, defaultValue: e.target.value } : f)))
              }
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Rules</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setRules((prev) => [
                ...prev,
                { fieldKey: "", operator: "eq", value: "", priceDelta: 0, multiplier: 1 },
              ])
            }
          >
            Add rule
          </Button>
        </div>
        {rules.map((rule, index) => (
          <div key={rule.id ?? `rule-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-3">
            <Input
              placeholder="Field key"
              value={rule.fieldKey}
              onChange={(e) =>
                setRules((prev) => prev.map((r, i) => (i === index ? { ...r, fieldKey: e.target.value } : r)))
              }
            />
            <Input
              placeholder="Operator"
              value={rule.operator}
              onChange={(e) =>
                setRules((prev) => prev.map((r, i) => (i === index ? { ...r, operator: e.target.value } : r)))
              }
            />
            <Input
              placeholder="Value"
              value={rule.value}
              onChange={(e) =>
                setRules((prev) => prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
              }
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Price delta"
              value={rule.priceDelta}
              onChange={(e) =>
                setRules((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, priceDelta: Number(e.target.value) } : r))
                )
              }
            />
            <Input
              type="number"
              step="0.0001"
              placeholder="Multiplier"
              value={rule.multiplier}
              onChange={(e) =>
                setRules((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, multiplier: Number(e.target.value) } : r))
                )
              }
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}>
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
