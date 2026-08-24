import { PRODUCT_CARD_PRESETS } from "@/features/products/card-design/product-card-presets";
import type { ProductCardStylePreset } from "@/features/products/card-design/product-card-design.types";

export function ProductCardPresetChips({
  activePreset,
  onApply,
}: {
  activePreset: ProductCardStylePreset;
  onApply: (presetId: ProductCardStylePreset) => void;
}) {
  return (
    <div className="apm-cta-presets">
      <span className="apm-cta-presets__label">Card presets</span>
      <div className="apm-cta-presets__chips">
        {PRODUCT_CARD_PRESETS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              className={`apm-cta-presets__chip${active ? " is-active" : ""}`}
              onClick={() => onApply(preset.id)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
