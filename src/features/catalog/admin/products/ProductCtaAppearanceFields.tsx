import { useMemo } from "react";
import type { ProductCtaVariant } from "@/features/products/lib/product-cta";
import type { ProductCtaAppearanceResolved } from "@/features/products/lib/product-cta-appearance";
import { CtaStylePresets } from "./CtaStylePresets";
import {
  type ProductCtaAlignment,
  type ProductCtaButtonSize,
  type ProductCtaHoverAnimation,
  type ProductCtaMobileBehavior,
  type ProductCtaPositionMode,
  type ProductCtaShadowPreset,
  type ProductCtaTextTransform,
} from "@/features/products/lib/product-cta-appearance";

type Props = {
  context: "page" | "card";
  value: ProductCtaAppearanceResolved;
  onChange: (next: ProductCtaAppearanceResolved) => void;
  variant?: ProductCtaVariant;
  onVariantChange?: (variant: ProductCtaVariant) => void;
};

type WidthMode = "auto" | "full" | "custom";

function widthModeOf(a: ProductCtaAppearanceResolved): WidthMode {
  if (a.fullWidth) return "full";
  if (a.buttonWidthCss.trim()) return "custom";
  return "auto";
}

export function ProductCtaAppearanceFields({
  context,
  value: a,
  onChange,
  variant = "solid",
  onVariantChange,
}: Props) {
  const id = context === "page" ? "cta-app-page" : "cta-app-card";
  const wm = useMemo(() => widthModeOf(a), [a]);

  const setWidthMode = (mode: WidthMode) => {
    if (mode === "full") onChange({ ...a, fullWidth: true, buttonWidthCss: "" });
    else if (mode === "auto") onChange({ ...a, fullWidth: false, buttonWidthCss: "" });
    else onChange({ ...a, fullWidth: false, buttonWidthCss: a.buttonWidthCss.trim() || "12rem" });
  };

  return (
    <fieldset className="pm-cta-app">
      <legend className="pm-cta-app__legend">{context === "page" ? "Product page button" : "Product card button"}</legend>

      {onVariantChange ? (
        <CtaStylePresets
          variant={variant}
          appearance={a}
          onApply={(v, next) => {
            onVariantChange(v);
            onChange(next);
          }}
        />
      ) : null}

      <div className="cta-app__group">
        <div className="cta-app__group-title">Layout</div>
        <div className="pm-cta-app__grid pm-cta-app__grid--layout">
          <label htmlFor={`${id}-align`}>
            <span>Button position (row)</span>
            <select
              id={`${id}-align`}
              value={a.alignment}
              onChange={(e) => onChange({ ...a, alignment: e.target.value as ProductCtaAlignment })}
            >
              <option value="start">Left</option>
              <option value="center">Center</option>
              <option value="end">Right</option>
              <option value="stretch">Full width (stretch)</option>
            </select>
          </label>
          <label htmlFor={`${id}-width-mode`}>
            <span>Button width</span>
            <select id={`${id}-width-mode`} value={wm} onChange={(e) => setWidthMode(e.target.value as WidthMode)}>
              <option value="auto">Auto (hug content)</option>
              <option value="full">Full width</option>
              <option value="custom">Custom (CSS)</option>
            </select>
          </label>
          {wm === "custom" ? (
            <label className="pm-span-2" htmlFor={`${id}-width-css`}>
              <span>Custom width (CSS)</span>
              <input
                id={`${id}-width-css`}
                value={a.buttonWidthCss}
                onChange={(e) => onChange({ ...a, buttonWidthCss: e.target.value, fullWidth: false })}
                placeholder="e.g. 12rem, 200px, min(100%, 18rem)"
              />
            </label>
          ) : null}
          <label htmlFor={`${id}-pos`}>
            {context === "page" ? "Position mode" : "Pin on scroll"}
            <select
              id={`${id}-pos`}
              value={context === "page" ? a.positionMode : a.floatingOnScroll ? "fixed" : "static"}
              onChange={(e) => {
                const v = e.target.value as ProductCtaPositionMode | "static" | "fixed";
                if (context === "page") onChange({ ...a, positionMode: v as ProductCtaPositionMode });
                else onChange({ ...a, floatingOnScroll: v === "fixed" });
              }}
            >
              {context === "page" ? (
                <>
                  <option value="static">Flow (default)</option>
                  <option value="sticky">Sticky (below header)</option>
                  <option value="fixed">Fixed bar</option>
                </>
              ) : (
                <>
                  <option value="static">Default</option>
                  <option value="fixed">Keep chip visible on scroll</option>
                </>
              )}
            </select>
          </label>
          <label htmlFor={`${id}-mob`}>
            Mobile behavior
            <select
              id={`${id}-mob`}
              value={a.mobileBehavior}
              onChange={(e) => onChange({ ...a, mobileBehavior: e.target.value as ProductCtaMobileBehavior })}
            >
              <option value="inherit">Same as desktop</option>
              <option value="full_width">Full width</option>
              <option value="compact">Compact</option>
              <option value="hide">Hide</option>
            </select>
          </label>
        </div>
      </div>

      <div className="cta-app__group">
        <div className="cta-app__group-title">Typography &amp; shape</div>
        <div className="pm-cta-app__grid">
          <label htmlFor={`${id}-size`}>
            Button size
            <select
              id={`${id}-size`}
              value={a.buttonSize}
              onChange={(e) => onChange({ ...a, buttonSize: e.target.value as ProductCtaButtonSize })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
          <label htmlFor={`${id}-radius`}>
            Border radius (px)
            <input
              id={`${id}-radius`}
              type="number"
              min={0}
              max={48}
              placeholder="Theme default"
              value={a.borderRadiusPx ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...a, borderRadiusPx: v === "" ? null : Math.min(48, Math.max(0, Number(v) || 0)) });
              }}
            />
          </label>
          <label htmlFor={`${id}-pad-y`}>
            Padding block (CSS)
            <input
              id={`${id}-pad-y`}
              value={a.paddingBlock}
              onChange={(e) => onChange({ ...a, paddingBlock: e.target.value })}
              placeholder="e.g. 0.5rem"
            />
          </label>
          <label htmlFor={`${id}-pad-x`}>
            Padding inline (CSS)
            <input
              id={`${id}-pad-x`}
              value={a.paddingInline}
              onChange={(e) => onChange({ ...a, paddingInline: e.target.value })}
              placeholder="e.g. 1rem"
            />
          </label>
          <label htmlFor={`${id}-fs`}>
            Font size (CSS)
            <input
              id={`${id}-fs`}
              value={a.fontSize}
              onChange={(e) => onChange({ ...a, fontSize: e.target.value })}
              placeholder="e.g. 0.75rem"
            />
          </label>
          <label htmlFor={`${id}-fw`}>
            Font weight
            <input
              id={`${id}-fw`}
              value={a.fontWeight === "" ? "" : String(a.fontWeight)}
              onChange={(e) => onChange({ ...a, fontWeight: e.target.value })}
              placeholder="e.g. 700"
            />
          </label>
          <label htmlFor={`${id}-ls`}>
            Letter spacing
            <input
              id={`${id}-ls`}
              value={a.letterSpacing}
              onChange={(e) => onChange({ ...a, letterSpacing: e.target.value })}
              placeholder="e.g. 0.06em"
            />
          </label>
          <label htmlFor={`${id}-tt`}>
            Text transform
            <select
              id={`${id}-tt`}
              value={a.textTransform}
              onChange={(e) => onChange({ ...a, textTransform: e.target.value as ProductCtaTextTransform })}
            >
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </label>
        </div>
      </div>

      <div className="cta-app__group">
        <div className="cta-app__group-title">Icon (inside button)</div>
        <div className="pm-cta-app__grid">
          <label htmlFor={`${id}-icon-pos`}>
            Icon position
            <select
              id={`${id}-icon-pos`}
              value={a.iconPosition}
              onChange={(e) => onChange({ ...a, iconPosition: e.target.value as "start" | "end" })}
            >
              <option value="start">Before label</option>
              <option value="end">After label</option>
            </select>
          </label>
          <label htmlFor={`${id}-icon-sz`}>
            Icon size (CSS)
            <input
              id={`${id}-icon-sz`}
              value={a.iconSize}
              onChange={(e) => onChange({ ...a, iconSize: e.target.value })}
              placeholder="e.g. 1.1em"
            />
          </label>
        </div>
      </div>

      <div className="cta-app__group">
        <div className="cta-app__group-title">Effects</div>
        <div className="pm-cta-app__grid">
          <label htmlFor={`${id}-shadow`}>
            Shadow
            <select
              id={`${id}-shadow`}
              value={a.shadow}
              onChange={(e) => onChange({ ...a, shadow: e.target.value as ProductCtaShadowPreset })}
            >
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="elevated">Elevated (cards)</option>
            </select>
          </label>
          <label htmlFor={`${id}-hover`}>
            Hover animation
            <select
              id={`${id}-hover`}
              value={a.hoverAnimation}
              onChange={(e) => onChange({ ...a, hoverAnimation: e.target.value as ProductCtaHoverAnimation })}
            >
              <option value="none">None</option>
              <option value="lift">Lift</option>
              <option value="glow">Glow</option>
              <option value="scale">Scale</option>
              <option value="underline">Underline</option>
            </select>
          </label>
          <label htmlFor={`${id}-tr`}>
            Transition (ms)
            <input
              id={`${id}-tr`}
              type="number"
              min={0}
              max={2000}
              value={a.transitionMs}
              onChange={(e) => onChange({ ...a, transitionMs: Math.min(2000, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </label>
          <label className="pm-inline-check pm-span-2" htmlFor={`${id}-theme`}>
            <input
              id={`${id}-theme`}
              type="checkbox"
              checked={a.inheritThemePreset}
              onChange={(e) => onChange({ ...a, inheritThemePreset: e.target.checked })}
            />
            Inherit active theme colors
          </label>
          <label className="pm-span-2" htmlFor={`${id}-preset`}>
            Custom style preset id (optional)
            <input
              id={`${id}-preset`}
              value={a.customPresetId ?? ""}
              onChange={(e) => onChange({ ...a, customPresetId: e.target.value.trim() || null })}
              placeholder="future theme packs"
            />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
