"use client";

import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

type Props = {
  label: string;
  amountName: string;
  currencyName?: string;
  defaultAmount?: string | number;
  defaultCurrency?: string;
  required?: boolean;
};

export function PriceFieldInput({
  label,
  amountName,
  currencyName = "currency",
  defaultAmount = "",
  defaultCurrency,
  required,
}: Props) {
  const { currency, numberLocale, activeLocale } = useAdminEditingLocale();
  const displayCurrency = (defaultCurrency ?? currency).toUpperCase();
  const amountNum = Number(defaultAmount);
  const hint =
    Number.isFinite(amountNum) && amountNum > 0
      ? formatPrice(amountNum, displayCurrency, numberLocale)
      : null;

  return (
    <div className="space-y-2">
      <Label htmlFor={amountName}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={amountName}
          name={amountName}
          type="number"
          step="any"
          min={0}
          defaultValue={defaultAmount === "" ? "" : String(defaultAmount)}
          required={required}
          className="flex-1"
        />
        <div className="flex h-10 min-w-[72px] items-center justify-center rounded-md border bg-muted px-2 text-xs font-medium tabular-nums">
          {displayCurrency}
        </div>
      </div>
      <input type="hidden" name={currencyName} value={displayCurrency} />
      {hint ? (
        <p className="text-xs text-muted-foreground">
          Preview ({activeLocale.label}): {hint}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Currency from language settings ({activeLocale.label}): {displayCurrency}
        </p>
      )}
    </div>
  );
}
