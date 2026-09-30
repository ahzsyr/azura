"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import type { PricingCalculatorPublic } from "@/presets/pricing/calculators/types";

type Props = {
  locale: Locale;
  calculator: PricingCalculatorPublic;
  title?: string;
  subtitle?: string;
  showDescription?: boolean;
  layout?: "stacked" | "inline" | "card";
};

function applyRules(
  base: number,
  values: Record<string, string>,
  rules: PricingCalculatorPublic["rules"]
): number {
  let total = base;
  for (const rule of rules) {
    const actual = values[rule.fieldKey] ?? "";
    if (!actual) continue;
    const matches =
      rule.operator === "eq"
        ? actual === rule.value
        : rule.operator === "neq"
          ? actual !== rule.value
          : rule.operator === "gt"
            ? Number(actual) > Number(rule.value)
            : rule.operator === "gte"
              ? Number(actual) >= Number(rule.value)
              : rule.operator === "lt"
                ? Number(actual) < Number(rule.value)
                : rule.operator === "lte"
                  ? Number(actual) <= Number(rule.value)
                  : actual.includes(rule.value);
    if (matches) {
      total = (total + rule.priceDelta) * (rule.multiplier || 1);
    }
  }
  return Math.max(0, Math.round(total * 100) / 100);
}

export function PricingCalculatorView({
  locale,
  calculator,
  title,
  subtitle,
  showDescription = true,
  layout = "stacked",
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of calculator.fields) {
      init[f.key] = f.defaultValue;
    }
    return init;
  });

  const description = pickLocale(calculator, "description", locale);
  const estimated = useMemo(
    () => applyRules(calculator.basePrice, values, calculator.rules),
    [calculator, values]
  );

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={cn("pb-calculator", `pb-calculator--${layout}`)}>
      {title && <h2 className="pb-calculator__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-calculator__subtitle text-muted-foreground">{subtitle}</p>}
      {showDescription && description && (
        <p className="pb-calculator__description text-sm text-muted-foreground mb-4">{description}</p>
      )}
      <div className="pb-calculator__form space-y-4">
        {calculator.fields.map((field) => {
          const label = pickLocale(field, "label", locale);
          return (
            <div key={field.id} className="pb-calculator__field space-y-1">
              <Label className="text-sm">{label}</Label>
              {field.fieldType === "SELECT" && Array.isArray(field.options) && field.options.length > 0 ? (
                <select
                  className="w-full border rounded-md h-9 px-2 text-sm"
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValue(field.key, e.target.value)}
                >
                  {(field.options as { value?: string; label?: string }[]).map((opt, i) => (
                    <option key={i} value={String(opt.value ?? opt)}>
                      {String(opt.label ?? opt.value ?? opt)}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.fieldType === "NUMBER" ? "number" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValue(field.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="pb-calculator__result mt-6 rounded-xl border bg-muted/30 p-4 flex items-center justify-between gap-4">
        <span className="text-sm font-medium">Estimated price</span>
        <span className="text-2xl font-bold tabular-nums">
          {estimated.toLocaleString(getShortLanguageLocale(locale), {
            style: "currency",
            currency: calculator.currency || "USD",
          })}
        </span>
      </div>
      <Button type="button" variant="outline" className="mt-3 w-full sm:w-auto" disabled>
        Get a quote
      </Button>
    </div>
  );
}
