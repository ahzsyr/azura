"use client";

import { Label } from "@/components/ui/label";
import type { OrderingProfileBuilderOption } from "@/features/builder/blocks/commerce/product-blocks/types";

type Props = {
  value?: string;
  onChange: (profileId: string) => void;
  options?: OrderingProfileBuilderOption[];
  label?: string;
  propHint?: string;
};

export function OrderingProfileSelect({
  value,
  onChange,
  options = [],
  label = "Ordering profile",
  propHint = "Uses Product Manager ordering. Default is Global Ordering.",
}: Props) {
  const id = (value ?? "").trim();
  const resolved = id && options.some((o) => o.id === id) ? id : "";
  const globalOption = options.find((o) => o.isGlobal);
  const otherProfiles = options.filter((o) => !o.isGlobal);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="w-full border rounded-md h-9 px-2 text-sm mt-1"
        value={resolved}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{globalOption?.label?.trim() || "Global Ordering"}</option>
        {otherProfiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.scopeType !== "GLOBAL" ? ` (${p.scopeType.toLowerCase()})` : ""}
          </option>
        ))}
      </select>
      {propHint ? <p className="mt-1 text-xs text-muted-foreground">{propHint}</p> : null}
    </div>
  );
}
