"use client";

import type { DeviceBreakpoint } from "@/types/block-system";
import {
  type ProductPageOverflowBlockKey,
  type ProductPageOverflowMode,
  type ResolvedProductPageOverflow,
} from "@/features/products/lib/product-page-overflow";

const BLOCK_LABELS: Record<ProductPageOverflowBlockKey, string> = {
  linkedTags: "Linked collection tags",
  crossLinks: "Cross-link groups",
  servicesBar: "Policy cards (delivery / payment / warranty)",
};

const VIEWPORTS: DeviceBreakpoint[] = ["mobile", "tablet", "desktop"];

export function ProductPageOverflowFields({
  value,
  onChange,
}: {
  value: ResolvedProductPageOverflow;
  onChange: (next: ResolvedProductPageOverflow) => void;
}) {
  return (
    <fieldset className="apm-fieldset">
      <legend className="apm-fieldset__legend">Overflow layout</legend>
      <p className="apm-fieldset__hint">
        Control how dense blocks collapse or scroll on each viewport (grid, horizontal slider, or
        collapse / accordion).
      </p>
      <div className="pm-cta-grid">
        {(Object.keys(BLOCK_LABELS) as ProductPageOverflowBlockKey[]).map((block) => (
          <div key={block} className="apm-pe-overflow-block">
            <strong className="apm-pe-overflow-block__title">{BLOCK_LABELS[block]}</strong>
            <div className="pm-cta-grid">
              {VIEWPORTS.map((vp) => (
                <label key={`${block}-${vp}`} className="pm-cta-field" htmlFor={`ppo-${block}-${vp}`}>
                  <span>{vp}</span>
                  <select
                    id={`ppo-${block}-${vp}`}
                    value={value[block][vp]}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        [block]: {
                          ...value[block],
                          [vp]: e.target.value as ProductPageOverflowMode,
                        },
                      })
                    }
                  >
                    <option value="grid">Grid</option>
                    <option value="slider">Slider</option>
                    <option value="collapse">Collapse</option>
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
