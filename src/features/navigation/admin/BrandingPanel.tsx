"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrandingState, BrandLayoutBreakpoint } from "@/features/navigation/types";
import {
  BRAND_NAME_SIZE_OPTIONS,
  BRAND_TAGLINE_SIZE_OPTIONS,
  DEFAULT_BRAND_NAME_TYPOGRAPHY,
  DEFAULT_BRAND_TAGLINE_TYPOGRAPHY,
  DEFAULT_LOGO_SIZING,
  normalizeBranding,
  resolveBrandFontFamily,
} from "@/features/navigation/branding-defaults";
import { setBranding } from "@/features/navigation/header-store";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { GOOGLE_FONT_OPTIONS } from "@/features/theme/constants";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderField, HeaderSelect, OptionButtonGroup } from "./header-builder-ui";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
} from "@/config/site";

interface Props {
  branding: BrandingState;
  brandingSourceReady?: boolean;
  onChange?: (branding: BrandingState) => void;
  description?: string;
}

export function BrandingPanel({ branding, brandingSourceReady = true, onChange, description }: Props) {
  const [form, setForm] = useState(() => normalizeBranding(branding));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setForm(normalizeBranding(branding));
  }, [branding]);

  const pushToStore = useCallback((next: BrandingState) => {
    const normalized = {
      ...next,
      logoText: next.logoText.trim() || DEFAULT_BRAND_SHORT,
      brandName: next.brandName.trim() || DEFAULT_BRAND_NAME,
      tagline: next.tagline.trim(),
    };
    if (onChange) {
      onChange(normalized);
      return;
    }
    if (!brandingSourceReady) return;
    setBranding(normalized);
  }, [brandingSourceReady, onChange]);

  const updateForm = useCallback(
    (patch: Partial<BrandingState>, immediate = false) => {
      setForm((prev) => {
        const next = normalizeBranding({ ...prev, ...patch });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (immediate) {
          pushToStore(next);
        } else {
          debounceRef.current = setTimeout(() => pushToStore(next), 150);
        }
        return next;
      });
    },
    [pushToStore]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const resetBranding = () => {
    const reset = normalizeBranding({
      logoMode: "text",
      logoText: DEFAULT_BRAND_SHORT,
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: DEFAULT_BRAND_NAME,
      tagline: DEFAULT_TAGLINE,
      showTagline: true,
      areaStyle: "default",
      brandLayoutMobile: "logo-and-text",
      brandLayoutDesktop: "logo-and-text",
      logoSizing: { ...DEFAULT_LOGO_SIZING },
      brandNameTypography: { ...DEFAULT_BRAND_NAME_TYPOGRAPHY },
      brandTaglineTypography: { ...DEFAULT_BRAND_TAGLINE_TYPOGRAPHY },
    });
    setForm(reset);
    pushToStore(reset);
  };

  const logoSizing = form.logoSizing ?? DEFAULT_LOGO_SIZING;
  const nameTypo = form.brandNameTypography ?? DEFAULT_BRAND_NAME_TYPOGRAPHY;
  const tagTypo = form.brandTaglineTypography ?? DEFAULT_BRAND_TAGLINE_TYPOGRAPHY;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {description ??
          "Logo and name shown in the site header. Values here override Site Settings when both are set. Use Save in the top bar to persist changes."}
      </p>

      <AdminCollapsibleSection title="Logo" description="Logo mode, images, and responsive sizing.">
        <div className="grid gap-4 sm:grid-cols-2">
          <HeaderField label="Logo mode" htmlFor="hb-logo-mode">
            <HeaderSelect
              id="hb-logo-mode"
              value={form.logoMode}
              onChange={(v) => updateForm({ logoMode: v as BrandingState["logoMode"] }, true)}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </HeaderSelect>
          </HeaderField>

          {form.logoMode === "text" ? (
            <HeaderField label="Logo text" htmlFor="hb-logo-text">
              <Input
                id="hb-logo-text"
                value={form.logoText}
                onChange={(e) => updateForm({ logoText: e.target.value })}
                placeholder="e.g. SM"
              />
            </HeaderField>
          ) : null}
        </div>

        {form.logoMode === "image" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MediaPickerField
              label="Image — light theme"
              url={form.logoImageLightUrl}
              trackMediaId={false}
              idFieldName=""
              mediaTypes={["IMAGE", "SVG"]}
              onChange={({ url }) => updateForm({ logoImageLightUrl: url, logoMode: "image" }, true)}
            />
            <MediaPickerField
              label="Image — dark theme"
              url={form.logoImageDarkUrl}
              trackMediaId={false}
              idFieldName=""
              mediaTypes={["IMAGE", "SVG"]}
              onChange={({ url }) => updateForm({ logoImageDarkUrl: url, logoMode: "image" }, true)}
            />
          </div>
        ) : null}

        <div className="mt-6 space-y-4 border-t pt-4">
          <div>
            <Label className="text-sm font-medium">Logo sizing</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Fixed sets explicit heights per breakpoint. Adaptive scales smoothly with viewport width.
            </p>
          </div>
          <OptionButtonGroup
            value={logoSizing.mode}
            options={[
              { value: "fixed", label: "Fixed per screen" },
              { value: "adaptive", label: "Adaptive (fluid)" },
            ]}
            onChange={(mode) =>
              updateForm({ logoSizing: { ...logoSizing, mode } }, true)
            }
            columns={2}
          />

          {logoSizing.mode === "fixed" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <HeaderField label="Mobile (≤640px)" htmlFor="logo-h-mobile">
                <Input
                  id="logo-h-mobile"
                  type="number"
                  min={16}
                  max={80}
                  value={logoSizing.heightMobile}
                  onChange={(e) =>
                    updateForm({
                      logoSizing: { ...logoSizing, heightMobile: Number(e.target.value) || 32 },
                    })
                  }
                />
              </HeaderField>
              <HeaderField label="Tablet (641–968px)" htmlFor="logo-h-tablet">
                <Input
                  id="logo-h-tablet"
                  type="number"
                  min={16}
                  max={80}
                  value={logoSizing.heightTablet}
                  onChange={(e) =>
                    updateForm({
                      logoSizing: { ...logoSizing, heightTablet: Number(e.target.value) || 36 },
                    })
                  }
                />
              </HeaderField>
              <HeaderField label="Desktop (≥969px)" htmlFor="logo-h-desktop">
                <Input
                  id="logo-h-desktop"
                  type="number"
                  min={16}
                  max={96}
                  value={logoSizing.heightDesktop}
                  onChange={(e) =>
                    updateForm({
                      logoSizing: { ...logoSizing, heightDesktop: Number(e.target.value) || 42 },
                    })
                  }
                />
              </HeaderField>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <HeaderField label="Minimum height (px)" htmlFor="logo-adaptive-min">
                <Input
                  id="logo-adaptive-min"
                  type="number"
                  min={16}
                  max={60}
                  value={logoSizing.adaptiveMin}
                  onChange={(e) =>
                    updateForm({
                      logoSizing: { ...logoSizing, adaptiveMin: Number(e.target.value) || 28 },
                    })
                  }
                />
              </HeaderField>
              <HeaderField label="Maximum height (px)" htmlFor="logo-adaptive-max">
                <Input
                  id="logo-adaptive-max"
                  type="number"
                  min={24}
                  max={96}
                  value={logoSizing.adaptiveMax}
                  onChange={(e) =>
                    updateForm({
                      logoSizing: { ...logoSizing, adaptiveMax: Number(e.target.value) || 48 },
                    })
                  }
                />
              </HeaderField>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={resetBranding}>
            Reset branding to defaults
          </Button>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Name & tagline" description="Brand text and typography.">
        <div className="grid gap-4 sm:grid-cols-2">
          <HeaderField label="Brand name" htmlFor="hb-brand-name">
            <Input
              id="hb-brand-name"
              value={form.brandName}
              onChange={(e) => updateForm({ brandName: e.target.value })}
              placeholder="Shown next to the logo"
            />
          </HeaderField>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hb-tagline">Brand tagline</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.showTagline}
                  onChange={(e) => updateForm({ showTagline: e.target.checked }, true)}
                />
                Visible in header
              </label>
            </div>
            <Input
              id="hb-tagline"
              value={form.tagline}
              onChange={(e) => updateForm({ tagline: e.target.value })}
              placeholder="Short line under or beside the name"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Brand name typography</p>
            <HeaderField label="Font" htmlFor="name-font-source">
              <HeaderSelect
                id="name-font-source"
                value={nameTypo.fontSource}
                onChange={(v) =>
                  updateForm({
                    brandNameTypography: {
                      ...nameTypo,
                      fontSource: v as typeof nameTypo.fontSource,
                    },
                  }, true)
                }
              >
                <option value="heading">Heading (theme)</option>
                <option value="body">Body (theme)</option>
                <option value="custom">Custom Google Font</option>
              </HeaderSelect>
            </HeaderField>
            {nameTypo.fontSource === "custom" ? (
              <HeaderField label="Custom font" htmlFor="name-custom-font">
                <HeaderSelect
                  id="name-custom-font"
                  value={nameTypo.customFont ?? GOOGLE_FONT_OPTIONS[0]}
                  onChange={(v) =>
                    updateForm({
                      brandNameTypography: { ...nameTypo, customFont: v },
                    }, true)
                  }
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <HeaderField label="Size mobile" htmlFor="name-size-mobile">
                <HeaderSelect
                  id="name-size-mobile"
                  value={nameTypo.sizeMobile}
                  onChange={(v) =>
                    updateForm({
                      brandNameTypography: { ...nameTypo, sizeMobile: v },
                    }, true)
                  }
                >
                  {BRAND_NAME_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
              <HeaderField label="Size desktop" htmlFor="name-size-desktop">
                <HeaderSelect
                  id="name-size-desktop"
                  value={nameTypo.sizeDesktop}
                  onChange={(v) =>
                    updateForm({
                      brandNameTypography: { ...nameTypo, sizeDesktop: v },
                    }, true)
                  }
                >
                  {BRAND_NAME_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
            </div>
            <HeaderField label="Weight" htmlFor="name-weight">
              <HeaderSelect
                id="name-weight"
                value={String(nameTypo.fontWeight)}
                onChange={(v) =>
                  updateForm({
                    brandNameTypography: {
                      ...nameTypo,
                      fontWeight: Number(v) as typeof nameTypo.fontWeight,
                    },
                  }, true)
                }
              >
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra bold (800)</option>
              </HeaderSelect>
            </HeaderField>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Tagline typography</p>
            <HeaderField label="Font" htmlFor="tag-font-source">
              <HeaderSelect
                id="tag-font-source"
                value={tagTypo.fontSource}
                onChange={(v) =>
                  updateForm({
                    brandTaglineTypography: {
                      ...tagTypo,
                      fontSource: v as typeof tagTypo.fontSource,
                    },
                  }, true)
                }
              >
                <option value="body">Body (theme)</option>
                <option value="heading">Heading (theme)</option>
                <option value="custom">Custom Google Font</option>
              </HeaderSelect>
            </HeaderField>
            {tagTypo.fontSource === "custom" ? (
              <HeaderField label="Custom font" htmlFor="tag-custom-font">
                <HeaderSelect
                  id="tag-custom-font"
                  value={tagTypo.customFont ?? GOOGLE_FONT_OPTIONS[0]}
                  onChange={(v) =>
                    updateForm({
                      brandTaglineTypography: { ...tagTypo, customFont: v },
                    }, true)
                  }
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <HeaderField label="Size mobile" htmlFor="tag-size-mobile">
                <HeaderSelect
                  id="tag-size-mobile"
                  value={tagTypo.sizeMobile}
                  onChange={(v) =>
                    updateForm({
                      brandTaglineTypography: { ...tagTypo, sizeMobile: v },
                    }, true)
                  }
                >
                  {BRAND_TAGLINE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
              <HeaderField label="Size desktop" htmlFor="tag-size-desktop">
                <HeaderSelect
                  id="tag-size-desktop"
                  value={tagTypo.sizeDesktop}
                  onChange={(v) =>
                    updateForm({
                      brandTaglineTypography: { ...tagTypo, sizeDesktop: v },
                    }, true)
                  }
                >
                  {BRAND_TAGLINE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </HeaderSelect>
              </HeaderField>
            </div>
            <HeaderField label="Weight" htmlFor="tag-weight">
              <HeaderSelect
                id="tag-weight"
                value={String(tagTypo.fontWeight)}
                onChange={(v) =>
                  updateForm({
                    brandTaglineTypography: {
                      ...tagTypo,
                      fontWeight: Number(v) as typeof tagTypo.fontWeight,
                    },
                  }, true)
                }
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
              </HeaderSelect>
            </HeaderField>
          </div>
        </div>

        <div
          className="mt-4 rounded-lg border bg-background p-4"
          aria-label="Typography preview"
        >
          <p className="mb-2 text-xs text-muted-foreground">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="font-bold"
              style={{
                fontFamily: resolveBrandFontFamily(nameTypo.fontSource, nameTypo.customFont),
                fontSize: nameTypo.sizeDesktop,
                fontWeight: nameTypo.fontWeight,
              }}
            >
              {form.brandName || "Brand name"}
            </div>
            {form.showTagline && form.tagline ? (
              <span
                style={{
                  fontFamily: resolveBrandFontFamily(tagTypo.fontSource, tagTypo.customFont),
                  fontSize: tagTypo.sizeDesktop,
                  fontWeight: tagTypo.fontWeight,
                  color: "var(--muted-foreground)",
                }}
              >
                {form.tagline}
              </span>
            ) : null}
          </div>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="View by screen size"
        description="Control logo vs text visibility. Breakpoint: 968px (same as main nav)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <HeaderField label="Mobile & small tablets (≤968px)" htmlFor="hb-brand-layout-mobile">
            <HeaderSelect
              id="hb-brand-layout-mobile"
              value={form.brandLayoutMobile}
              onChange={(v) =>
                updateForm({ brandLayoutMobile: v as BrandLayoutBreakpoint }, true)
              }
            >
              <option value="logo-only">Logo only</option>
              <option value="text-only">Name & tagline only</option>
              <option value="logo-and-text">Logo + name (& tagline if enabled)</option>
            </HeaderSelect>
          </HeaderField>
          <HeaderField label="Desktop (≥969px)" htmlFor="hb-brand-layout-desktop">
            <HeaderSelect
              id="hb-brand-layout-desktop"
              value={form.brandLayoutDesktop}
              onChange={(v) =>
                updateForm({ brandLayoutDesktop: v as BrandLayoutBreakpoint }, true)
              }
            >
              <option value="logo-only">Logo only</option>
              <option value="text-only">Name & tagline only</option>
              <option value="logo-and-text">Logo + name (& tagline if enabled)</option>
            </HeaderSelect>
          </HeaderField>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Brand area" description="Visual style around the logo block.">
        <HeaderField label="Style" htmlFor="hb-area-style">
          <HeaderSelect
            id="hb-area-style"
            value={form.areaStyle}
            onChange={(v) =>
              updateForm({ areaStyle: v as BrandingState["areaStyle"] }, true)
            }
          >
            <option value="default">Default</option>
            <option value="soft">Soft fill</option>
            <option value="outline">Outline</option>
          </HeaderSelect>
        </HeaderField>
      </AdminCollapsibleSection>

      <LocaleTabPanel
        entityType="SiteIdentity"
        entityId="default"
        sourceData={{
          siteTagline: form.tagline,
          siteDescription: form.brandName,
        }}
      />
    </div>
  );
}
