"use client";

import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import {
  BUILDER_DESKTOP_MIN_PX,
  BUILDER_MOBILE_MAX_PX,
  BUILDER_TABLET_MAX_PX,
} from "@/features/products/lib/product-pdp-breakpoints";

const VIEWPORT_OPTIONS: {
  id: ProductPageViewport;
  label: string;
  range: string;
}[] = [
  { id: "desktop", label: "Desktop", range: `≥${BUILDER_DESKTOP_MIN_PX}px` },
  { id: "tablet", label: "Tablet", range: `${BUILDER_MOBILE_MAX_PX + 1}–${BUILDER_TABLET_MAX_PX}px` },
  { id: "mobile", label: "Mobile", range: `≤${BUILDER_MOBILE_MAX_PX}px` },
];

export function AdminViewportToggle({
  value,
  onChange,
  inheritHint,
}: {
  value: ProductPageViewport;
  onChange: (next: ProductPageViewport) => void;
  inheritHint?: string;
}) {
  return (
    <div className="apm-viewport-toggle-wrap">
      <div className="apm-viewport-toggle" role="group" aria-label="Edit viewport">
        {VIEWPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`apm-viewport-toggle__btn${value === opt.id ? " is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            <span className="apm-viewport-toggle__label">{opt.label}</span>
            <span className="apm-viewport-toggle__range">{opt.range}</span>
          </button>
        ))}
      </div>
      {inheritHint ? <p className="apm-fieldset__hint">{inheritHint}</p> : null}
    </div>
  );
}

export function viewportInheritHint(viewport: ProductPageViewport): string | undefined {
  if (viewport === "tablet") {
    return "Tablet overrides inherit from desktop when unset.";
  }
  if (viewport === "mobile") {
    return "Mobile overrides inherit from tablet (then desktop) when unset.";
  }
  return undefined;
}
