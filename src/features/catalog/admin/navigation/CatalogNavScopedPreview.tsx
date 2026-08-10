"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useResolvedThemePreview } from "@/features/theme/components/theme-studio/resolve-theme-client";
import type { ThemeTokens } from "@/types/theme";
import {
  CatalogTopNavigationBar,
  type CatalogTopNavigationBarItem,
} from "@/features/catalog/components/catalog-top-navigation-bar";
import type {
  CatalogNavigationAppearance,
  CatalogNavigationLayout,
  CatalogNavigationResponsive,
} from "@/features/catalog/navigation/types";

const VIEWPORT_MAX: Record<"desktop" | "tablet" | "mobile", string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "420px",
};

/**
 * Storefront-fidelity preview root: injects published theme CSS into a scoped
 * node (admin shell tokens are not enough for true storefront colors).
 */
export function CatalogNavScopedPreview({
  tokens,
  items,
  appearance,
  layout,
  responsive,
  previewFilterQuery,
  onPreviewItemClick,
  previewViewport = "desktop",
  className,
}: {
  tokens: ThemeTokens;
  items: CatalogTopNavigationBarItem[];
  appearance?: CatalogNavigationAppearance;
  layout?: CatalogNavigationLayout;
  responsive?: CatalogNavigationResponsive;
  previewFilterQuery?: string | null;
  onPreviewItemClick?: (item: CatalogTopNavigationBarItem) => void;
  previewViewport?: "desktop" | "tablet" | "mobile";
  className?: string;
}) {
  const resolved = useResolvedThemePreview(tokens);
  const appearanceMode = useMemo(
    () => (resolved.htmlAttributes.className?.includes("dark") ? "dark" : "light"),
    [resolved.htmlAttributes.className],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-background",
        appearanceMode === "dark" && "dark",
        className,
      )}
      data-theme={appearanceMode}
      data-card-style={resolved.cardStyle ?? undefined}
      data-border-style={resolved.borderStyle ?? undefined}
      data-preset-id={resolved.preset.presetId ?? undefined}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${resolved.css.theme}\n${resolved.css.presetVisual ?? ""}`,
        }}
      />
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Add visible items to preview the catalog navigation strip.
        </p>
      ) : (
        <div
          className="mx-auto w-full transition-[max-width] duration-200"
          style={{ maxWidth: VIEWPORT_MAX[previewViewport] }}
        >
          <CatalogTopNavigationBar
            items={items}
            appearance={appearance}
            layout={layout}
            responsive={responsive}
            previewFilterQuery={previewFilterQuery ?? ""}
            onPreviewItemClick={onPreviewItemClick}
            previewViewport={previewViewport}
          />
        </div>
      )}
    </div>
  );
}
