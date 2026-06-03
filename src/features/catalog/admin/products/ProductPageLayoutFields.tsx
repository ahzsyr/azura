import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";

export function ProductPageLayoutFields({
  value,
  onChange,
}: {
  value: ResolvedProductPageLayout;
  onChange: (next: ResolvedProductPageLayout) => void;
}) {
  const id = "ppl";
  return (
    <fieldset className="apm-fieldset">
      <legend className="apm-fieldset__legend">Page layout &amp; chrome</legend>
      <p className="apm-fieldset__hint">
        Controls the product detail template (gallery, buy box, tabs). Saved separately from the CTA button styling below on this tab.
      </p>
      <div className="pm-cta-grid">
        <label className="pm-cta-field" htmlFor={`${id}-gal`}>
          <span>Gallery layout</span>
          <select
            id={`${id}-gal`}
            value={value.galleryLayout}
            onChange={(e) =>
              onChange({
                ...value,
                galleryLayout: e.target.value as ResolvedProductPageLayout["galleryLayout"],
              })
            }
          >
            <option value="classic">Classic split</option>
            <option value="wide_gallery">Wider gallery column</option>
            <option value="stacked">Stacked (single column)</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-media`}>
          <span>Media vs buy box</span>
          <select
            id={`${id}-media`}
            value={value.mediaPosition}
            onChange={(e) =>
              onChange({
                ...value,
                mediaPosition: e.target.value as ResolvedProductPageLayout["mediaPosition"],
              })
            }
          >
            <option value="start">Gallery first (left / top)</option>
            <option value="end">Buy box first (gallery on trailing side)</option>
          </select>
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.stickyBreadcrumb}
            onChange={(e) => onChange({ ...value, stickyBreadcrumb: e.target.checked })}
          />
          Sticky breadcrumb (desktop)
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.fixedBuyColumn}
            onChange={(e) => onChange({ ...value, fixedBuyColumn: e.target.checked })}
          />
          Fixed buy column layout (desktop)
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.stickyBuyBox}
            onChange={(e) => onChange({ ...value, stickyBuyBox: e.target.checked })}
          />
          Sticky add-to-cart column (desktop)
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-crumb-top`}>
          <span>Breadcrumb sticky top (CSS)</span>
          <input
            id={`${id}-crumb-top`}
            value={value.breadcrumbStickyTop}
            placeholder="5.5rem"
            onChange={(e) => onChange({ ...value, breadcrumbStickyTop: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-sticky-top`}>
          <span>Sticky top offset (CSS)</span>
          <input
            id={`${id}-sticky-top`}
            value={value.buyBoxStickyTop}
            placeholder="6rem"
            onChange={(e) => onChange({ ...value, buyBoxStickyTop: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-hero-gap`}>
          <span>Hero gap (CSS)</span>
          <input
            id={`${id}-hero-gap`}
            value={value.heroGap}
            placeholder="e.g. 1rem"
            onChange={(e) => onChange({ ...value, heroGap: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-sec-gap`}>
          <span>Section gap (CSS)</span>
          <input
            id={`${id}-sec-gap`}
            value={value.sectionGap}
            placeholder="e.g. 1.25rem"
            onChange={(e) => onChange({ ...value, sectionGap: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-radius`}>
          <span>Border radius (CSS)</span>
          <input
            id={`${id}-radius`}
            value={value.borderRadius}
            placeholder="Theme default"
            onChange={(e) => onChange({ ...value, borderRadius: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-surface`}>
          <span>Surface style</span>
          <select
            id={`${id}-surface`}
            value={value.surfaceStyle}
            onChange={(e) =>
              onChange({
                ...value,
                surfaceStyle: e.target.value as ResolvedProductPageLayout["surfaceStyle"],
              })
            }
          >
            <option value="plain">Plain</option>
            <option value="card">Card panels</option>
            <option value="elevated">Elevated hero</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-tabs`}>
          <span>Tabs / accordion</span>
          <select
            id={`${id}-tabs`}
            value={value.tabsMode}
            onChange={(e) =>
              onChange({
                ...value,
                tabsMode: e.target.value as ResolvedProductPageLayout["tabsMode"],
              })
            }
          >
            <option value="tabs">Horizontal tabs</option>
            <option value="accordion">Accordion-style (stacked controls)</option>
          </select>
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.mobileGalleryFirst}
            onChange={(e) => onChange({ ...value, mobileGalleryFirst: e.target.checked })}
          />
          Mobile: gallery before buy box
        </label>
        <label className="pm-cta-field pm-inline-check">
          <input
            type="checkbox"
            checked={value.inheritThemePreset}
            onChange={(e) => onChange({ ...value, inheritThemePreset: e.target.checked })}
          />
          Inherit active theme preset colors where applicable
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-title-fs`}>
          <span>Title / heading size (CSS)</span>
          <input
            id={`${id}-title-fs`}
            value={value.titleFontSize}
            placeholder="e.g. 1.05rem"
            onChange={(e) => onChange({ ...value, titleFontSize: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-body-fs`}>
          <span>Body text size (CSS)</span>
          <input
            id={`${id}-body-fs`}
            value={value.bodyFontSize}
            placeholder="e.g. 0.92rem"
            onChange={(e) => onChange({ ...value, bodyFontSize: e.target.value })}
          />
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-anim`}>
          <span>Hero animation</span>
          <select
            id={`${id}-anim`}
            value={value.animationEntrance}
            onChange={(e) =>
              onChange({
                ...value,
                animationEntrance: e.target.value as ResolvedProductPageLayout["animationEntrance"],
              })
            }
          >
            <option value="none">None</option>
            <option value="fade">Fade in</option>
            <option value="slide-up">Slide up</option>
          </select>
        </label>
        <label className="pm-cta-field" htmlFor={`${id}-anim-ms`}>
          <span>Animation duration (ms)</span>
          <input
            id={`${id}-anim-ms`}
            type="number"
            min={0}
            max={2000}
            value={value.animationDurationMs}
            onChange={(e) =>
              onChange({
                ...value,
                animationDurationMs: Math.min(2000, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
      </div>
    </fieldset>
  );
}
