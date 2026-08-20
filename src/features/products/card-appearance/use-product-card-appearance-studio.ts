"use client";

import { useCallback, useMemo, useState } from "react";
import { applyProductCardPreset } from "@/features/products/card-design/product-card-presets";
import type { ProductCardStylePreset } from "@/features/products/card-design/product-card-design.types";
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import { resolveProductCardDesign } from "@/features/products/card-design/resolve-product-card-design";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import {
  appearanceConfigFromParts,
  applyQuickViewMode,
} from "./product-card-appearance-adapter";
import type {
  ProductCardAppearanceConfig,
  ProductCardAppearanceSectionId,
} from "./product-card-appearance.types";

export function useProductCardAppearanceStudio(initial: ProductCardAppearanceConfig) {
  const [config, setConfig] = useState<ProductCardAppearanceConfig>(() =>
    appearanceConfigFromParts(initial.design, initial.layout, initial.responsive),
  );
  const [activeSection, setActiveSection] = useState<ProductCardAppearanceSectionId>("presets");
  const [comparePresetId, setComparePresetId] = useState<ProductCardStylePreset | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));

  const isDirty = useMemo(
    () => JSON.stringify(config) !== savedSnapshot,
    [config, savedSnapshot],
  );

  const patchDesign = useCallback((partial: Partial<ResolvedProductCardDesign>) => {
    setConfig((prev) =>
      appearanceConfigFromParts({ ...prev.design, ...partial }, prev.layout, prev.responsive),
    );
  }, []);

  const patchLayout = useCallback((partial: Partial<ResolvedProductCardLayout>) => {
    setConfig((prev) =>
      appearanceConfigFromParts(prev.design, { ...prev.layout, ...partial }, prev.responsive),
    );
  }, []);

  const patchResponsive = useCallback(
    (layer: keyof ProductCardAppearanceConfig["responsive"], partial: import("@/features/products/card-design/product-card-design.types").ProductCardDesignPartial) => {
      setConfig((prev) => ({
        ...prev,
        responsive: {
          ...prev.responsive,
          [layer]: { ...prev.responsive[layer], ...partial },
        },
      }));
    },
    [],
  );

  const applyPreset = useCallback((presetId: ProductCardStylePreset) => {
    setConfig((prev) => {
      const merged = applyProductCardPreset(presetId, prev.design);
      const design = resolveProductCardDesign({
        partial: { ...merged, presetId },
        legacyLayout: prev.layout,
      });
      return appearanceConfigFromParts(design, prev.layout, prev.responsive);
    });
  }, []);

  const resetPreset = useCallback(() => {
    setConfig((prev) => {
      const merged = applyProductCardPreset(prev.design.presetId, {});
      const design = resolveProductCardDesign({
        partial: merged,
        legacyLayout: prev.layout,
      });
      return appearanceConfigFromParts(design, prev.layout, prev.responsive);
    });
  }, []);

  const setQuickViewMode = useCallback(
    (mode: ResolvedProductCardDesign["quickViewMode"]) => {
      setConfig((prev) => {
        const applied = applyQuickViewMode(mode, prev.layout, prev.design);
        return appearanceConfigFromParts(applied.design, applied.layout, prev.responsive);
      });
    },
    [],
  );

  const markSaved = useCallback((snapshot?: ProductCardAppearanceConfig) => {
    const next = snapshot ?? config;
    setConfig(appearanceConfigFromParts(next.design, next.layout, next.responsive));
    setSavedSnapshot(JSON.stringify(next));
  }, [config]);

  const resetToSaved = useCallback(() => {
    const parsed = JSON.parse(savedSnapshot) as ProductCardAppearanceConfig;
    setConfig(appearanceConfigFromParts(parsed.design, parsed.layout, parsed.responsive));
  }, [savedSnapshot]);

  const compareSnapshot = useMemo(() => {
    if (!comparePresetId) return null;
    const merged = applyProductCardPreset(comparePresetId, {});
    const design = resolveProductCardDesign({
      partial: { ...merged, presetId: comparePresetId },
      legacyLayout: config.layout,
    });
    return appearanceConfigFromParts(design, config.layout, config.responsive);
  }, [comparePresetId, config]);

  return {
    config,
    activeSection,
    setActiveSection,
    patchDesign,
    patchLayout,
    patchResponsive,
    applyPreset,
    resetPreset,
    setQuickViewMode,
    isDirty,
    markSaved,
    resetToSaved,
    comparePresetId,
    setComparePresetId,
    compareSnapshot,
  };
}

export type ProductCardAppearanceStudio = ReturnType<typeof useProductCardAppearanceStudio>;
