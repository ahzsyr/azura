"use client";

import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";
import {
  getBuilderBlock,
  isDisplayKey,
  type BuilderBlockId,
} from "./product-page-block-registry";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import {
  AnimationCards,
  BuilderCollapsible,
  LayoutPresetChips,
  RadiusChips,
  SpacingSlider,
} from "./controls/builder-controls";
import type { ProductPageOverflowBlockKey, ProductPageOverflowMode } from "@/features/products/lib/product-page-overflow";
import { ProductCardsVisibilitySection } from "./product-cards-visibility-section";
import {
  PRODUCT_PAGE_COMPACT_ELEMENT_KEYS,
  PRODUCT_PAGE_COMPACT_ELEMENT_LABELS,
  type ProductPageCompactElementKey,
} from "@/features/products/lib/product-page-compact-display";

const OVERFLOW_BLOCK_LABELS: Record<ProductPageOverflowBlockKey, string> = {
  linkedTags: "Linked collection tags",
  crossLinks: "Cross-link groups",
  servicesBar: "Policy cards",
};

function PageLayoutProperties({ studio }: { studio: ProductPageBuilderStudio }) {
  const layout = studio.activeLayout;
  const viewport = studio.viewport;

  return (
    <>
      <LayoutPresetChips activePreset={null} onApply={(id) => studio.applyPreset(id)} />

      <BuilderCollapsible title="Layout">
        <OptionButtonGroup
          value={layout.galleryLayout}
          options={[
            { value: "classic", label: "Classic" },
            { value: "wide_gallery", label: "Wide gallery" },
            { value: "stacked", label: "Stacked" },
          ]}
          onChange={(value) =>
            studio.patchLayout({ galleryLayout: value as ResolvedProductPageLayout["galleryLayout"] })
          }
        />
        <div className="ppb-field-spacer" />
        <OptionButtonGroup
          value={layout.mediaPosition}
          options={[
            { value: "start", label: "Gallery first" },
            { value: "end", label: "Buy box first" },
          ]}
          onChange={(value) =>
            studio.patchLayout({ mediaPosition: value as ResolvedProductPageLayout["mediaPosition"] })
          }
        />
        <div className="ppb-field-spacer" />
        <OptionButtonGroup
          value={layout.galleryThumbPlacement}
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
            { value: "below", label: "Bottom" },
          ]}
          onChange={(value) =>
            studio.patchLayout({
              galleryThumbPlacement: value as ResolvedProductPageLayout["galleryThumbPlacement"],
            })
          }
        />
        <div className="ppb-field-spacer" />
        <OptionButtonGroup
          value={layout.surfaceStyle}
          options={[
            { value: "plain", label: "Plain" },
            { value: "card", label: "Card" },
            { value: "elevated", label: "Elevated" },
          ]}
          onChange={(value) =>
            studio.patchLayout({ surfaceStyle: value as ResolvedProductPageLayout["surfaceStyle"] })
          }
        />
      </BuilderCollapsible>

      <ProductCardsVisibilitySection studio={studio} />

      <BuilderCollapsible title="Spacing">
        <SpacingSlider
          label="Hero gap"
          value={layout.heroGap}
          onChange={(heroGap) => studio.patchLayout({ heroGap })}
        />
        <SpacingSlider
          label="Section spacing"
          value={layout.sectionGap}
          onChange={(sectionGap) => studio.patchLayout({ sectionGap })}
        />
        <RadiusChips value={layout.borderRadius} onChange={(borderRadius) => studio.patchLayout({ borderRadius })} />
      </BuilderCollapsible>

      <BuilderCollapsible title="Gallery" defaultOpen={false}>
        {viewport === "tablet" ? (
          <label className="ppb-check">
            <span>Tablet columns</span>
            <select
              value={layout.tabletColumnMode}
              onChange={(e) =>
                studio.patchLayout({
                  tabletColumnMode: e.target.value as ResolvedProductPageLayout["tabletColumnMode"],
                })
              }
            >
              <option value="single">Single column</option>
              <option value="split">Split</option>
            </select>
          </label>
        ) : null}
        {viewport === "mobile" || viewport === "tablet" ? (
          <label className="ppb-check">
            <span>Gallery mobile style</span>
            <select
              value={layout.galleryMobileLayout}
              onChange={(e) =>
                studio.patchLayout({
                  galleryMobileLayout: e.target.value as ResolvedProductPageLayout["galleryMobileLayout"],
                })
              }
            >
              <option value="immersive">Immersive</option>
              <option value="classic">Classic</option>
            </select>
          </label>
        ) : null}
        <OptionButtonGroup
          value={layout.tabsMode}
          options={[
            { value: "tabs", label: "Tabs" },
            { value: "accordion", label: "Accordion" },
          ]}
          onChange={(value) =>
            studio.patchLayout({ tabsMode: value as ResolvedProductPageLayout["tabsMode"] })
          }
        />
      </BuilderCollapsible>

      <BuilderCollapsible title="Advanced" defaultOpen={false}>
        {viewport === "desktop" ? (
          <>
            <label className="ppb-check">
              <input
                type="checkbox"
                checked={layout.stickyBuyBox}
                onChange={(e) => studio.patchLayout({ stickyBuyBox: e.target.checked })}
              />
              Sticky buy box
            </label>
            <label className="ppb-check">
              <input
                type="checkbox"
                checked={layout.fixedBuyColumn}
                onChange={(e) => studio.patchLayout({ fixedBuyColumn: e.target.checked })}
              />
              Fixed buy column
            </label>
            <label className="ppb-check">
              <input
                type="checkbox"
                checked={layout.stickyBreadcrumb}
                onChange={(e) => studio.patchLayout({ stickyBreadcrumb: e.target.checked })}
              />
              Sticky breadcrumb
            </label>
            <label className="ppb-field">
              <span>Breadcrumb sticky top</span>
              <input
                value={layout.breadcrumbStickyTop}
                onChange={(e) => studio.patchLayout({ breadcrumbStickyTop: e.target.value })}
              />
            </label>
            <label className="ppb-field">
              <span>Buy box sticky top</span>
              <input
                value={layout.buyBoxStickyTop}
                onChange={(e) => studio.patchLayout({ buyBoxStickyTop: e.target.value })}
              />
            </label>
          </>
        ) : null}
        <label className="ppb-check">
          <input
            type="checkbox"
            checked={layout.inheritThemePreset}
            onChange={(e) => studio.patchLayout({ inheritThemePreset: e.target.checked })}
          />
          Inherit theme preset colors
        </label>
        <label className="ppb-field">
          <span>Title font size</span>
          <input
            value={layout.titleFontSize}
            onChange={(e) => studio.patchLayout({ titleFontSize: e.target.value })}
          />
        </label>
        <label className="ppb-field">
          <span>Body font size</span>
          <input
            value={layout.bodyFontSize}
            onChange={(e) => studio.patchLayout({ bodyFontSize: e.target.value })}
          />
        </label>
        <AnimationCards
          value={layout.animationEntrance}
          onChange={(animationEntrance) => studio.patchLayout({ animationEntrance })}
        />
        <label className="ppb-field">
          <span>Animation duration (ms)</span>
          <input
            type="number"
            min={0}
            max={2000}
            value={layout.animationDurationMs}
            onChange={(e) =>
              studio.patchLayout({
                animationDurationMs: Math.min(2000, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
      </BuilderCollapsible>

      {viewport === "desktop" ? (
        <BuilderCollapsible title="Compact buy box (on scroll)" defaultOpen={false}>
          <label className="ppb-check">
            <input
              type="checkbox"
              checked={studio.elementsRules.desktop.compactDisplay.enabled}
              onChange={(e) =>
                studio.patchElementsLayer({
                  compactDisplay: {
                    ...studio.elementsRules.desktop.compactDisplay,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            Shrink buy column while scrolling
          </label>
          <label className="ppb-field">
            <span>Scroll offset (px)</span>
            <input
              type="number"
              min={0}
              max={500}
              value={studio.elementsRules.desktop.compactDisplay.scrollOffsetPx}
              onChange={(e) =>
                studio.patchElementsLayer({
                  compactDisplay: {
                    ...studio.elementsRules.desktop.compactDisplay,
                    scrollOffsetPx: Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </label>
          <div className="ppb-compact-grid">
            {PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.map((key) => (
              <label key={key} className="ppb-check">
                <input
                  type="checkbox"
                  checked={studio.elementsRules.desktop.compactDisplay.elements[key]}
                  disabled={key === "title"}
                  onChange={(e) => {
                    const elements = {
                      ...studio.elementsRules.desktop.compactDisplay.elements,
                      [key]: e.target.checked,
                    } as Record<ProductPageCompactElementKey, boolean>;
                    if (key !== "title") elements.title = true;
                    studio.patchElementsLayer({
                      compactDisplay: {
                        ...studio.elementsRules.desktop.compactDisplay,
                        elements,
                        visibleKeys: PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.filter((k) => elements[k]),
                      },
                    });
                  }}
                />
                {PRODUCT_PAGE_COMPACT_ELEMENT_LABELS[key]}
              </label>
            ))}
          </div>
        </BuilderCollapsible>
      ) : null}
    </>
  );
}

function BlockProperties({
  studio,
  blockId,
}: {
  studio: ProductPageBuilderStudio;
  blockId: BuilderBlockId;
}) {
  const block = getBuilderBlock(blockId);
  const enabled = isDisplayKey(blockId)
    ? studio.activeElementsLayer.display[blockId]?.enabled !== false
    : false;

  return (
    <>
      <header className="ppb-props-block-head">
        <h3 className="ppb-props-block-head__title">{block?.label ?? blockId}</h3>
        {block?.description ? <p className="ppb-props-block-head__desc">{block.description}</p> : null}
      </header>

      {isDisplayKey(blockId) ? (
        <BuilderCollapsible title="Visibility">
          <label className="ppb-check">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => studio.toggleBlockVisibility(blockId, e.target.checked)}
            />
            Show on {studio.viewport}
          </label>
        </BuilderCollapsible>
      ) : null}

      {blockId === "gallery" ? (
        <BuilderCollapsible title="Gallery settings">
          <OptionButtonGroup
            value={studio.activeLayout.galleryLayout}
            options={[
              { value: "classic", label: "Grid" },
              { value: "wide_gallery", label: "Slider" },
              { value: "stacked", label: "Stacked" },
            ]}
            onChange={(value) =>
              studio.patchLayout({ galleryLayout: value as ResolvedProductPageLayout["galleryLayout"] })
            }
          />
          <div className="ppb-field-spacer" />
          <OptionButtonGroup
            value={studio.activeLayout.galleryThumbPlacement}
            options={[
              { value: "left", label: "Vertical left" },
              { value: "right", label: "Vertical right" },
              { value: "below", label: "Horizontal" },
            ]}
            onChange={(value) =>
              studio.patchLayout({
                galleryThumbPlacement: value as ResolvedProductPageLayout["galleryThumbPlacement"],
              })
            }
          />
          <div className="ppb-field-spacer" />
          <OptionButtonGroup
            value={studio.activeLayout.mediaPosition}
            options={[
              { value: "start", label: "Left" },
              { value: "end", label: "Right" },
            ]}
            onChange={(value) =>
              studio.patchLayout({ mediaPosition: value as ResolvedProductPageLayout["mediaPosition"] })
            }
          />
        </BuilderCollapsible>
      ) : null}

      {block?.overflowKey ? (
        <BuilderCollapsible title="Overflow layout">
          <p className="ppb-hint">How this block behaves on dense viewports.</p>
          {(["desktop", "tablet", "mobile"] as const).map((vp) => (
            <label key={vp} className="ppb-field">
              <span>{OVERFLOW_BLOCK_LABELS[block.overflowKey!]} — {vp}</span>
              <select
                value={studio.overflow[block.overflowKey!][vp]}
                onChange={(e) => {
                  const mode = e.target.value as ProductPageOverflowMode;
                  studio.patchOverflow({
                    ...studio.overflow,
                    [block.overflowKey!]: {
                      ...studio.overflow[block.overflowKey!],
                      [vp]: mode,
                    },
                  });
                }}
              >
                <option value="grid">Grid</option>
                <option value="slider">Slider</option>
                <option value="collapse">Collapse</option>
              </select>
            </label>
          ))}
        </BuilderCollapsible>
      ) : null}
    </>
  );
}

export function ProductPagePropertiesPanel({ studio }: { studio: ProductPageBuilderStudio }) {
  const selected = studio.selectedBlockId;

  return (
    <aside className="ppb-panel ppb-panel--right">
      <header className="ppb-panel__head">
        <h3 className="ppb-panel__title">Properties</h3>
        <p className="ppb-panel__desc">
          {selected ? "Block settings" : "Page-level layout and chrome"}
        </p>
      </header>
      <div className="ppb-panel__body">
        {selected ? (
          <BlockProperties studio={studio} blockId={selected} />
        ) : (
          <PageLayoutProperties studio={studio} />
        )}
      </div>
    </aside>
  );
}
