"use client";

import { useState } from "react";
import { CatalogCard } from "@/components/catalog/catalog-card";
import type { CatalogCardData } from "@/features/catalog/types";
import {
  mergeDisplaySettings,
  type DisplaySettings,
} from "@/schemas/catalog/display-settings";
import { EntityDisplaySettingsPanel } from "./entity-display-settings-panel";

type EntityDisplayPreviewProps = {
  source: "packages" | "hotels" | "services";
  item: CatalogCardData;
  locale?: string;
  initialSettings?: Partial<DisplaySettings>;
};

export function EntityDisplayPreview({
  source,
  item,
  locale = "en",
  initialSettings,
}: EntityDisplayPreviewProps) {
  const [displaySettings, setDisplaySettings] = useState<Partial<DisplaySettings>>(
    initialSettings ?? {}
  );
  const merged = mergeDisplaySettings(displaySettings);

  return (
    <div className="space-y-6">
      <EntityDisplaySettingsPanel
        source={source}
        value={displaySettings}
        onChange={setDisplaySettings}
        showPreview
      />
      <div className="max-w-sm">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Live preview</p>
        <CatalogCard
          locale={locale}
          linkMode="locale-path"
          item={item}
          displaySettings={merged}
        />
      </div>
    </div>
  );
}
