"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "inherit" | "off" | "custom";

type Props = {
  label: string;
  value: Mode;
  onChange: (value: Mode) => void;
  allowCustom?: boolean;
  className?: string;
};

export function InheritModeField({
  label,
  value,
  onChange,
  allowCustom = true,
  className,
}: Props) {
  const options: { id: Mode; label: string }[] = [
    { id: "inherit", label: "Inherit site" },
    { id: "off", label: "Off" },
  ];
  if (allowCustom) {
    options.push({ id: "custom", label: "Custom" });
  }

  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs transition-colors",
              value === opt.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-primary/50",
            )}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InheritOffField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "inherit" | "off";
  onChange: (value: "inherit" | "off") => void;
}) {
  return (
    <InheritModeField
      label={label}
      value={value}
      onChange={(v) => onChange(v === "custom" ? "inherit" : v)}
      allowCustom={false}
    />
  );
}
