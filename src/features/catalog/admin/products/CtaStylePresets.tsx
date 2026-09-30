import type { ProductCtaVariant } from "@/features/products/lib/product-cta";
import type { ProductCtaAppearanceResolved } from "@/features/products/lib/product-cta-appearance";
import { CTA_STYLE_PRESETS } from "./cta-style-presets";

export function CtaStylePresets({
  variant,
  appearance,
  onApply,
}: {
  variant: ProductCtaVariant;
  appearance: ProductCtaAppearanceResolved;
  onApply: (variant: ProductCtaVariant, appearance: ProductCtaAppearanceResolved) => void;
}) {
  return (
    <div className="apm-cta-presets">
      <span className="apm-cta-presets__label">Quick style</span>
      <div className="apm-cta-presets__chips">
        {CTA_STYLE_PRESETS.map((preset) => {
          const active = variant === preset.variant;
          return (
            <button
              key={preset.id}
              type="button"
              className={`apm-cta-presets__chip${active ? " is-active" : ""}`}
              onClick={() => onApply(preset.variant, { ...appearance, ...preset.patch })}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
