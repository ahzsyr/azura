"use client";

import { useState } from "react";
import { ExternalLink, Layers, LayoutGrid, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { viewportInheritHint } from "../AdminViewportToggle";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";
import { ProductPageComponentsPanel } from "./product-page-components-panel";
import { ProductPageStructureCanvas } from "./product-page-structure-canvas";
import { ProductPagePropertiesPanel } from "./product-page-properties-panel";
import { BuilderViewportToggle } from "./builder-viewport-toggle";
import { cn } from "@/lib/utils";
import "./product-page-builder.css";

type BuilderSubTab = "components" | "structure";

const SUB_TABS: Array<{ id: BuilderSubTab; label: string; icon: typeof LayoutGrid }> = [
  { id: "components", label: "Components", icon: LayoutGrid },
  { id: "structure", label: "Structure", icon: Layers },
];

export function ProductPageBuilderPanel({
  studio,
  onPreview,
  onSave,
  saving,
}: {
  studio: ProductPageBuilderStudio;
  onPreview?: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const [subTab, setSubTab] = useState<BuilderSubTab>("components");

  return (
    <section className="ppb-root" aria-labelledby="ppb-title">
      <header className="ppb-header">
        <div className="ppb-header__left">
          <h2 id="ppb-title" className="ppb-header__title">
            Product Page Layout
          </h2>
          <p className="ppb-header__desc">
            Customize the structure and appearance of your product detail page.
          </p>
        </div>
        <div className="ppb-header__actions">
          <Button type="button" variant="outline" size="sm" disabled={!studio.canUndo} onClick={studio.undo}>
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!studio.canRedo} onClick={studio.redo}>
            <Redo2 className="h-4 w-4" />
            Redo
          </Button>
          {onPreview ? (
            <Button type="button" variant="outline" size="sm" onClick={onPreview}>
              <ExternalLink className="h-4 w-4" />
              Preview
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={studio.resetToSaved}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          {onSave ? (
            <Button type="button" size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="ppb-subnav">
        <div className="ppb-subnav__tabs" role="tablist" aria-label="Builder sections">
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={subTab === id}
              className={cn("ppb-subnav__tab", subTab === id && "is-active")}
              onClick={() => setSubTab(id)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <BuilderViewportToggle
          value={studio.viewport}
          onChange={studio.setViewport}
          inheritHint={subTab === "structure" ? viewportInheritHint(studio.viewport) : undefined}
          compact
        />
      </div>

      {subTab === "components" ? (
        <div className="ppb-workspace ppb-workspace--components" role="tabpanel">
          <ProductPageComponentsPanel studio={studio} />
          <ProductPagePropertiesPanel studio={studio} />
        </div>
      ) : (
        <div className="ppb-workspace ppb-workspace--structure" role="tabpanel">
          <ProductPageStructureCanvas studio={studio} />
        </div>
      )}
    </section>
  );
}
