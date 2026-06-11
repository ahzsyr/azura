import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";

export function ProductCardLayoutFields({
  value,
  onChange,
}: {
  value: ResolvedProductCardLayout;
  onChange: (next: ResolvedProductCardLayout) => void;
}) {
  const id = "pcl";
  return (
    <fieldset className="apm-fieldset">
      <legend className="apm-fieldset__legend">Card chrome &amp; grid behavior</legend>
      <p className="apm-fieldset__hint">
        Applies to catalog product cards (product index, collections, frequently-bought). CTA chip styling is configured in the section below.
      </p>
      <div className="pm-cta-grid">
        <label className="pm-cta-field" htmlFor={`${id}-hover`}>
          <span>Hover behavior</span>
          <select
            id={`${id}-hover`}
            value={value.hoverBehavior}
            onChange={(e) =>
              onChange({
                ...value,
                hoverBehavior: e.target.value as ResolvedProductCardLayout["hoverBehavior"],
              })
            }
          >
            <option value="lift">Lift + shadow</option>
            <option value="glow">Outline glow</option>
            <option value="scale_image">Scale image</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-ratio`}>
          <span>Image aspect ratio</span>
          <select
            id={`${id}-ratio`}
            value={value.imageAspectRatio}
            onChange={(e) =>
              onChange({
                ...value,
                imageAspectRatio: e.target.value as ResolvedProductCardLayout["imageAspectRatio"],
              })
            }
          >
            <option value="auto">Card size default</option>
            <option value="1-1">1:1</option>
            <option value="4-3">4:3</option>
            <option value="3-4">3:4</option>
            <option value="16-9">16:9</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-badge`}>
          <span>Sale badge corner</span>
          <select
            id={`${id}-badge`}
            value={value.badgePosition}
            onChange={(e) =>
              onChange({
                ...value,
                badgePosition: e.target.value as ResolvedProductCardLayout["badgePosition"],
              })
            }
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-shadow`}>
          <span>Shadow</span>
          <select
            id={`${id}-shadow`}
            value={value.shadow}
            onChange={(e) =>
              onChange({
                ...value,
                shadow: e.target.value as ResolvedProductCardLayout["shadow"],
              })
            }
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-bw`}>
          <span>Border width (CSS)</span>
          <input
            id={`${id}-bw`}
            value={value.borderWidth}
            placeholder="1px"
            onChange={(e) => onChange({ ...value, borderWidth: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-br`}>
          <span>Border radius (CSS)</span>
          <input
            id={`${id}-br`}
            value={value.borderRadius}
            placeholder="Theme token"
            onChange={(e) => onChange({ ...value, borderRadius: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-overlay`}>
          <span>Overlay CTA strength (%)</span>
          <input
            id={`${id}-overlay`}
            type="number"
            min={0}
            max={100}
            value={value.overlayStrength}
            onChange={(e) =>
              onChange({
                ...value,
                overlayStrength: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-tfs`}>
          <span>Title size (CSS)</span>
          <input
            id={`${id}-tfs`}
            value={value.titleFontSize}
            placeholder="inherit"
            onChange={(e) => onChange({ ...value, titleFontSize: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-pfs`}>
          <span>Price size (CSS)</span>
          <input
            id={`${id}-pfs`}
            value={value.priceFontSize}
            placeholder="1rem"
            onChange={(e) => onChange({ ...value, priceFontSize: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-pad`}>
          <span>Content padding (CSS)</span>
          <input
            id={`${id}-pad`}
            value={value.contentPadding}
            placeholder="0.9rem"
            onChange={(e) => onChange({ ...value, contentPadding: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-padm`}>
          <span>Mobile padding (CSS)</span>
          <input
            id={`${id}-padm`}
            value={value.contentPaddingMobile}
            placeholder="Optional override"
            onChange={(e) => onChange({ ...value, contentPaddingMobile: e.target.value })}
          />
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.showCompare}
            onChange={(e) => onChange({ ...value, showCompare: e.target.checked })}
          />
          Show compare icon on cards
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.showQuickAction}
            onChange={(e) => onChange({ ...value, showQuickAction: e.target.checked })}
          />
          Show quick-view bar on hover
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-primary-action`}>
          <span>Primary card button</span>
          <select
            id={`${id}-primary-action`}
            value={value.cardPrimaryAction}
            onChange={(e) =>
              onChange({
                ...value,
                cardPrimaryAction: e.target.value as ResolvedProductCardLayout["cardPrimaryAction"],
              })
            }
          >
            <option value="buy_now">Buy Now</option>
            <option value="cta">CTA only (replaces Buy Now)</option>
          </select>
          <span className="pm-cta-field__hint">
            CTA mode hides Buy Now on cards and shows the quote/CTA button as the sole primary action.
          </span>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-action-arrangement`}>
          <span>Card button row layout</span>
          <select
            id={`${id}-action-arrangement`}
            value={value.cardActionArrangement}
            onChange={(e) =>
              onChange({
                ...value,
                cardActionArrangement: e.target.value as ResolvedProductCardLayout["cardActionArrangement"],
              })
            }
          >
            <option value="auto">Auto (responsive)</option>
            <option value="single_row">Single row</option>
            <option value="stacked">Stacked</option>
          </select>
          <span className="pm-cta-field__hint">
            Controls bottom-bar and inline card actions. Single row keeps buttons on one line when space allows.
          </span>
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.inheritThemePreset}
            onChange={(e) => onChange({ ...value, inheritThemePreset: e.target.checked })}
          />
          Inherit theme preset accents
        </label>
      </div>
    </fieldset>
  );
}
