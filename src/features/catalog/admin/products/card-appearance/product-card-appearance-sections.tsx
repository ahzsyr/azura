"use client";

import { useState } from "react";
import { ProductCardPresetChips } from "../ProductCardPresetChips";
import { BuilderCollapsible } from "../builder/controls/builder-controls";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import type { ProductCardAppearanceStudio } from "@/features/products/card-appearance/use-product-card-appearance-studio";
import { ProductCardContentOrderList } from "./product-card-content-order-list";

const BADGE_RULE_LABELS: Record<string, string> = {
  sale: "Sale",
  new: "New",
  trending: "Trending",
  staff_pick: "Staff pick",
  bestseller: "Bestseller",
  low_stock: "Low stock",
};

export function ProductCardAppearanceSections({ studio }: { studio: ProductCardAppearanceStudio }) {
  const { config, activeSection } = studio;
  const { design, layout } = config;

  switch (activeSection) {
    case "presets":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Design presets</h3>
          <p className="pca-section__lede">
            Complete starting templates. Applying a preset updates all supported visual properties;
            you can still customize individual settings afterward.
          </p>
          <ProductCardPresetChips activePreset={design.presetId} onApply={studio.applyPreset} />
          <div className="pca-section__actions">
            <button type="button" className="apm-btn-ghost" onClick={studio.resetPreset}>
              Reset to preset defaults
            </button>
            <label className="pca-compare-select">
              <span>Compare preset</span>
              <select
                value={studio.comparePresetId ?? ""}
                onChange={(e) =>
                  studio.setComparePresetId(
                    e.target.value ? (e.target.value as typeof design.presetId) : null,
                  )
                }
              >
                <option value="">Off</option>
                <option value="modern_commerce">Modern Commerce</option>
                <option value="luxury">Luxury</option>
                <option value="glass">Glass</option>
                <option value="minimal">Minimal</option>
                <option value="electronics">Electronics</option>
                <option value="b2b_catalog">B2B Catalog</option>
              </select>
            </label>
          </div>
          {studio.comparePresetId ? (
            <p className="pca-section__hint">
              Preview toggle: use &quot;Compare view&quot; in the preview toolbar to see the selected
              preset side-by-side with your current design.
            </p>
          ) : null}
        </section>
      );

    case "layout":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Layout &amp; structure</h3>
          <Field label="Card layout">
            <select
              value={design.layout}
              onChange={(e) =>
                studio.patchDesign({
                  layout: e.target.value as typeof design.layout,
                })
              }
            >
              <option value="classic_grid">Classic grid</option>
              <option value="compact_store">Compact store</option>
              <option value="marketplace">Marketplace</option>
              <option value="luxury_showcase">Luxury showcase</option>
              <option value="editorial">Editorial</option>
              <option value="horizontal">Horizontal</option>
              <option value="floating">Floating</option>
              <option value="split">Split</option>
              <option value="masonry">Masonry</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </Field>
          <Field label="Image ratio">
            <select
              value={layout.imageAspectRatio}
              onChange={(e) =>
                studio.patchLayout({
                  imageAspectRatio: e.target.value as typeof layout.imageAspectRatio,
                })
              }
            >
              <option value="auto">Auto</option>
              <option value="1-1">1:1</option>
              <option value="4-3">4:3</option>
              <option value="3-4">3:4</option>
              <option value="16-9">16:9</option>
            </select>
          </Field>
          <Field label="Content alignment">
            <OptionButtonGroup
              value={design.contentAlignment}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "mixed", label: "Mixed" },
              ]}
              onChange={(value) =>
                studio.patchDesign({
                  contentAlignment: value as typeof design.contentAlignment,
                })
              }
            />
          </Field>
          <Field label="Button row layout">
            <select
              value={layout.cardActionArrangement}
              onChange={(e) =>
                studio.patchLayout({
                  cardActionArrangement: e.target.value as typeof layout.cardActionArrangement,
                })
              }
            >
              <option value="auto">Auto (responsive)</option>
              <option value="single_row">Single row</option>
              <option value="stacked">Stacked</option>
            </select>
          </Field>
          <Field label="Badge placement">
            <select
              value={design.badgePosition}
              onChange={(e) =>
                studio.patchDesign({
                  badgePosition: e.target.value as typeof design.badgePosition,
                })
              }
            >
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom">Bottom</option>
              <option value="inline">Inline</option>
            </select>
          </Field>
        </section>
      );

    case "content":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Content visibility</h3>
          <p className="pca-section__hint">
            Price, stock, rating, compare, and brand visibility are controlled in the{" "}
            <a href="#product-page">Product Page</a> tab under Page visibility.
          </p>
          <label className="pm-inline-check">
            <input
              type="checkbox"
              checked={design.showCategory}
              onChange={(e) => studio.patchDesign({ showCategory: e.target.checked })}
            />
            Show category line
          </label>
          <Field label="Content order">
            <ProductCardContentOrderList
              order={design.contentOrder}
              onChange={(contentOrder) => studio.patchDesign({ contentOrder })}
            />
          </Field>
        </section>
      );

    case "style":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Visual style</h3>
          <Field label="Style theme">
            <select
              value={design.style}
              onChange={(e) =>
                studio.patchDesign({ style: e.target.value as typeof design.style })
              }
            >
              <option value="modern_commerce">Modern commerce</option>
              <option value="minimal">Minimal</option>
              <option value="luxury">Luxury</option>
              <option value="glass">Glass</option>
              <option value="editorial">Editorial</option>
              <option value="dark_premium">Dark premium</option>
              <option value="neon_tech">Neon tech</option>
            </select>
          </Field>
          <Field label="Pricing style">
            <select
              value={design.pricingMode}
              onChange={(e) =>
                studio.patchDesign({
                  pricingMode: e.target.value as typeof design.pricingMode,
                })
              }
            >
              <option value="minimal">Minimal</option>
              <option value="retail">Retail</option>
              <option value="marketplace">Marketplace</option>
              <option value="luxury">Luxury</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>
          <Field label="Theme accent">
            <OptionButtonGroup
              value={design.inheritThemePreset ? "inherit" : "custom"}
              options={[
                { value: "inherit", label: "Inherit global theme" },
                { value: "custom", label: "Custom card accent" },
              ]}
              onChange={(value) =>
                studio.patchDesign({ inheritThemePreset: value === "inherit" })
              }
            />
          </Field>
          <Field label="Card surface">
            <OptionButtonGroup
              value={design.cardSurface}
              options={[
                { value: "flat", label: "Flat" },
                { value: "elevated", label: "Elevated" },
                { value: "glass", label: "Glass" },
                { value: "premium", label: "Premium" },
              ]}
              onChange={(value) =>
                studio.patchDesign({ cardSurface: value as typeof design.cardSurface })
              }
            />
          </Field>
        </section>
      );

    case "spacing":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Spacing &amp; dimensions</h3>
          <div className="pm-cta-grid">
            <TextField label="Border radius" value={layout.borderRadius} placeholder="Theme token" onChange={(borderRadius) => studio.patchLayout({ borderRadius })} />
            <TextField label="Border width" value={layout.borderWidth} placeholder="1px" onChange={(borderWidth) => studio.patchLayout({ borderWidth })} />
            <TextField label="Content padding" value={layout.contentPadding} placeholder="0.9rem" onChange={(contentPadding) => studio.patchLayout({ contentPadding })} />
            <TextField label="Mobile padding" value={layout.contentPaddingMobile} placeholder="Optional" onChange={(contentPaddingMobile) => studio.patchLayout({ contentPaddingMobile })} />
            <TextField label="Title size" value={layout.titleFontSize} placeholder="inherit" onChange={(titleFontSize) => studio.patchLayout({ titleFontSize })} />
            <TextField label="Price size" value={layout.priceFontSize} placeholder="1rem" onChange={(priceFontSize) => studio.patchLayout({ priceFontSize })} />
            <Field label="Shadow strength">
              <select
                value={layout.shadow}
                onChange={(e) =>
                  studio.patchLayout({ shadow: e.target.value as typeof layout.shadow })
                }
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
          </div>
        </section>
      );

    case "media":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Media &amp; badges</h3>
          <label className="pm-inline-check">
            <input
              type="checkbox"
              checked={design.media.hoverSwap}
              onChange={(e) =>
                studio.patchDesign({ media: { ...design.media, hoverSwap: e.target.checked } })
              }
            />
            Enable image hover swap
          </label>
          <label className="pm-inline-check">
            <input
              type="checkbox"
              checked={design.media.galleryEnabled}
              onChange={(e) =>
                studio.patchDesign({
                  media: { ...design.media, galleryEnabled: e.target.checked },
                })
              }
            />
            Enable gallery preview
          </label>
          <Field label="Maximum badges">
            <input
              type="number"
              min={1}
              max={6}
              value={design.maxBadges}
              onChange={(e) =>
                studio.patchDesign({
                  maxBadges: Math.max(1, Math.min(6, Number(e.target.value) || 1)),
                })
              }
            />
          </Field>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Badge rules</legend>
            {design.badgeRules.map((rule, index) => (
              <label key={rule.type} className="pm-inline-check">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => {
                    const badgeRules = [...design.badgeRules];
                    badgeRules[index] = { ...rule, enabled: e.target.checked };
                    studio.patchDesign({ badgeRules });
                  }}
                />
                {BADGE_RULE_LABELS[rule.type] ?? rule.type}
              </label>
            ))}
          </fieldset>
        </section>
      );

    case "actions":
      return (
        <section className="pca-section">
          <h3 className="pca-section__title">Actions &amp; engagement</h3>
          <p className="pca-section__hint">
            Button colors and variants are configured under <a href="#cta">CTA Button</a> → Card style.
            Quick view visibility on cards also depends on{" "}
            <a href="#product-page">Product Page</a> → Page visibility.
          </p>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Allowed actions</legend>
            {(["buy_now", "cta", "wishlist", "compare", "quick_view"] as const).map((type) => (
              <label key={type} className="pm-inline-check">
                <input
                  type="checkbox"
                  checked={design.actions.enabledTypes.includes(type)}
                  onChange={(e) => {
                    const set = new Set(design.actions.enabledTypes);
                    if (e.target.checked) set.add(type);
                    else set.delete(type);
                    studio.patchDesign({
                      actions: { ...design.actions, enabledTypes: [...set] },
                    });
                  }}
                />
                {type.replace("_", " ")}
              </label>
            ))}
          </fieldset>
          <Field label="Primary action">
            <select
              value={design.actions.primaryAction}
              onChange={(e) =>
                studio.patchDesign({
                  actions: {
                    ...design.actions,
                    primaryAction: e.target.value as "buy_now" | "cta",
                  },
                })
              }
            >
              <option value="buy_now">Buy Now</option>
              <option value="cta">CTA only</option>
            </select>
          </Field>
          <Field label="Quick view behavior">
            <OptionButtonGroup
              value={design.quickViewMode}
              options={[
                { value: "disabled", label: "Disabled" },
                { value: "hover_overlay", label: "Hover overlay" },
                { value: "action_button", label: "Action button" },
              ]}
              onChange={(value) => studio.setQuickViewMode(value as typeof design.quickViewMode)}
            />
          </Field>
        </section>
      );

    case "motion":
      return (
        <MotionSection studio={studio} />
      );

    case "responsive":
      return (
        <ResponsiveSection studio={studio} />
      );

    case "advanced":
      return (
        <AdvancedSection studio={studio} />
      );

    default:
      return null;
  }
}

function MotionSection({ studio }: { studio: ProductCardAppearanceStudio }) {
  const { design } = studio.config;
  const [effectsOpen, setEffectsOpen] = useState(design.effects.enabled);

  return (
    <section className="pca-section">
      <h3 className="pca-section__title">Motion &amp; interactions</h3>
      <Field label="Motion preset">
        <select
          value={design.motion}
          onChange={(e) =>
            studio.patchDesign({ motion: e.target.value as typeof design.motion })
          }
        >
          <option value="subtle">Subtle</option>
          <option value="premium">Premium</option>
          <option value="interactive">Interactive</option>
          <option value="luxury">Luxury</option>
          <option value="disabled">Disabled</option>
        </select>
      </Field>
      <Field label="Hover effect">
        <select
          value={design.hoverEffect}
          onChange={(e) =>
            studio.patchDesign({
              hoverEffect: e.target.value as typeof design.hoverEffect,
            })
          }
        >
          <option value="none">None</option>
          <option value="lift">Lift</option>
          <option value="glow">Glow</option>
          <option value="scale_image">Scale image</option>
          <option value="tilt">Tilt</option>
          <option value="spotlight">Spotlight</option>
          <option value="reveal">Reveal</option>
          <option value="depth">Depth</option>
          <option value="cinematic">Cinematic</option>
          <option value="liquid">Liquid</option>
        </select>
      </Field>
      <label className="pm-inline-check">
        <input
          type="checkbox"
          checked={design.effects.enabled}
          onChange={(e) => {
            setEffectsOpen(e.target.checked);
            studio.patchDesign({
              effects: { ...design.effects, enabled: e.target.checked },
            });
          }}
        />
        Enable enhanced effects
      </label>
      {effectsOpen ? (
        <BuilderCollapsible title="Advanced effects" defaultOpen>
          {(
            [
              ["glow", "Glow layer"],
              ["glassLayer", "Glass layer"],
              ["gradientBorder", "Gradient border"],
              ["lightSweep", "Light sweep"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="pm-inline-check">
              <input
                type="checkbox"
                checked={design.effects[key]}
                onChange={(e) =>
                  studio.patchDesign({
                    effects: { ...design.effects, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </BuilderCollapsible>
      ) : null}
    </section>
  );
}

function ResponsiveSection({ studio }: { studio: ProductCardAppearanceStudio }) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const layer = studio.config.responsive[viewport] ?? {};

  return (
    <section className="pca-section">
      <h3 className="pca-section__title">Responsive design</h3>
      <p className="pca-section__hint">
        Override card design per breakpoint. Unset fields inherit from the base settings above.
      </p>
      <div className="apm-card-live-preview__devices pca-viewport-tabs" role="group">
        {(["desktop", "tablet", "mobile"] as const).map((vp) => (
          <button
            key={vp}
            type="button"
            className={viewport === vp ? "is-active" : ""}
            onClick={() => setViewport(vp)}
          >
            {vp.charAt(0).toUpperCase() + vp.slice(1)}
          </button>
        ))}
      </div>
      <Field label="Layout override">
        <select
          value={layer.layout ?? ""}
          onChange={(e) =>
            studio.patchResponsive(viewport, {
              layout: e.target.value
                ? (e.target.value as typeof studio.config.design.layout)
                : undefined,
            })
          }
        >
          <option value="">Inherit</option>
          <option value="classic_grid">Classic grid</option>
          <option value="compact_store">Compact store</option>
          <option value="marketplace">Marketplace</option>
          <option value="luxury_showcase">Luxury showcase</option>
        </select>
      </Field>
      <Field label="Motion override">
        <select
          value={layer.motion ?? ""}
          onChange={(e) =>
            studio.patchResponsive(viewport, {
              motion: e.target.value
                ? (e.target.value as typeof studio.config.design.motion)
                : undefined,
            })
          }
        >
          <option value="">Inherit</option>
          <option value="subtle">Subtle</option>
          <option value="premium">Premium</option>
          <option value="luxury">Luxury</option>
          <option value="disabled">Disabled</option>
        </select>
      </Field>
      <Field label="Hover effect override">
        <select
          value={layer.hoverEffect ?? ""}
          onChange={(e) =>
            studio.patchResponsive(viewport, {
              hoverEffect: e.target.value
                ? (e.target.value as typeof studio.config.design.hoverEffect)
                : undefined,
            })
          }
        >
          <option value="">Inherit</option>
          <option value="lift">Lift</option>
          <option value="glow">Glow</option>
          <option value="none">None</option>
          <option value="depth">Depth</option>
        </select>
      </Field>
    </section>
  );
}

function AdvancedSection({ studio }: { studio: ProductCardAppearanceStudio }) {
  const { design, layout } = studio.config;
  return (
    <section className="pca-section">
      <BuilderCollapsible title="Advanced" defaultOpen={false}>
        <fieldset className="apm-fieldset">
          <legend className="apm-fieldset__legend">Personalization highlights</legend>
          {(
            [
              ["highlightRecent", "Recent"],
              ["highlightRecommended", "Recommended"],
              ["highlightTrending", "Trending"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="pm-inline-check">
              <input
                type="checkbox"
                checked={design.personalization[key]}
                onChange={(e) =>
                  studio.patchDesign({
                    personalization: {
                      ...design.personalization,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Field label="Overlay CTA strength (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={layout.overlayStrength}
            onChange={(e) =>
              studio.patchLayout({
                overlayStrength: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </Field>
        <details className="pca-json">
          <summary>Raw configuration (debug)</summary>
          <pre>{JSON.stringify(studio.config, null, 2)}</pre>
        </details>
      </BuilderCollapsible>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="pm-cta-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="pm-cta-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
