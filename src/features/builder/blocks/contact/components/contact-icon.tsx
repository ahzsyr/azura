"use client";

import { cn } from "@/lib/utils";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import type { ResolvedContactCardAppearance } from "@/features/builder/blocks/contact/schemas/common";

type Props = {
  name?: string;
  style?: ResolvedContactCardAppearance["iconStyle"];
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const WRAP: Record<ResolvedContactCardAppearance["iconStyle"], string> = {
  plain: "",
  circle: "rounded-full bg-muted p-2",
  rounded: "rounded-lg bg-muted p-2",
  square: "rounded-none bg-muted p-2",
};

export function ContactIcon({ name, style = "plain", size = "md", className }: Props) {
  if (!name) return null;
  const Icon = resolveMarketingIcon(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-foreground",
        WRAP[style],
        className,
      )}
    >
      <Icon className={SIZE[size]} />
    </span>
  );
}
