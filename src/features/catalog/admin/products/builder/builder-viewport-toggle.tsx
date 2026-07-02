"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import {
  BUILDER_DESKTOP_MIN_PX,
  BUILDER_MOBILE_MAX_PX,
  BUILDER_TABLET_MAX_PX,
} from "@/features/products/lib/product-pdp-breakpoints";
import { cn } from "@/lib/utils";

const VIEWPORTS: Array<{
  id: ProductPageViewport;
  label: string;
  range: string;
  Icon: typeof Monitor;
}> = [
  { id: "desktop", label: "Desktop", range: `≥${BUILDER_DESKTOP_MIN_PX}px`, Icon: Monitor },
  {
    id: "tablet",
    label: "Tablet",
    range: `${BUILDER_MOBILE_MAX_PX + 1}–${BUILDER_TABLET_MAX_PX}px`,
    Icon: Tablet,
  },
  { id: "mobile", label: "Mobile", range: `≤${BUILDER_MOBILE_MAX_PX}px`, Icon: Smartphone },
];

export function BuilderViewportToggle({
  value,
  onChange,
  inheritHint,
  compact = false,
}: {
  value: ProductPageViewport;
  onChange: (next: ProductPageViewport) => void;
  inheritHint?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("ppb-viewport", compact && "ppb-viewport--compact")}>
      <div className="ppb-viewport__group" role="group" aria-label="Edit viewport">
        {VIEWPORTS.map(({ id, label, range, Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              className={cn("ppb-viewport__btn", active && "is-active")}
              aria-pressed={active}
              onClick={() => onChange(id)}
            >
              <Icon className="ppb-viewport__icon h-4 w-4" aria-hidden />
              <span className="ppb-viewport__text">
                <span className="ppb-viewport__label">{label}</span>
                {!compact ? <span className="ppb-viewport__range">{range}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {inheritHint ? <p className="ppb-viewport__hint">{inheritHint}</p> : null}
    </div>
  );
}
