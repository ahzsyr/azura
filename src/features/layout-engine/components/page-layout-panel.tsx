"use client";

import { layoutRegistry } from "@/features/layout-engine/layout-registry";
import { compositionService } from "@/features/layout-engine/composition.service";
import {
  getCompositionRegionLabel,
  getEditableRegions,
} from "@/features/layout-engine/composition-editor-helpers";
import type { ColumnRatioToken, Composition, LayoutType, RegionId } from "@/features/layout-engine/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  composition: Composition;
  dir?: "ltr" | "rtl";
  onChange: (next: Composition) => void;
};

function layoutPreviewColumns(type: LayoutType): string {
  switch (type) {
    case "left-sidebar":
      return "1fr 2fr";
    case "right-sidebar":
      return "2fr 1fr";
    case "three-column":
      return "1fr 2fr 1fr";
    case "split":
      return "1fr 1fr";
    default:
      return "1fr";
  }
}

export function PageLayoutPanel({ composition, dir = "ltr", onChange }: Props) {
  const layouts = layoutRegistry.list();
  const current = layoutRegistry.getOrThrow(composition.layout.type);
  const currentRatio =
    composition.layout.regions.asideStart?.ratio ??
    composition.layout.regions.asideEnd?.ratio ??
    current.defaultRatio ??
    "equal";
  const isRtl = dir === "rtl";
  const topEnabled = composition.layout.topSection?.enabled === true;
  const hasAsideStart = current.activeRegions.includes("asideStart");
  const hasAsideEnd = current.activeRegions.includes("asideEnd");
  const editableRegions = getEditableRegions(composition);

  const patchLayout = (patch: Partial<Composition["layout"]>) => {
    onChange(
      compositionService.validate({
        ...composition,
        layout: {
          ...composition.layout,
          ...patch,
        },
      }),
    );
  };

  const patchRegionSticky = (regionId: "asideStart" | "asideEnd", sticky: boolean) => {
    patchLayout({
      regions: {
        ...composition.layout.regions,
        [regionId]: {
          ...composition.layout.regions[regionId],
          sticky,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page Layout</CardTitle>
          <CardDescription>
            Choose the structural layout first, then customize content independently inside each region.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {layouts.map((layout) => (
            <button
              key={layout.type}
              type="button"
              onClick={() =>
                onChange(
                  compositionService.applyLayoutSwitch(
                    composition,
                    composition.layout.type,
                    layout.type,
                  ),
                )
              }
              className={cn(
                "rounded-xl border p-4 text-left transition hover:border-primary/50",
                composition.layout.type === layout.type && "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="space-y-2">
                {topEnabled && layout.supportsTopSection && (
                  <div className="rounded-lg border bg-muted/30 px-3 py-3 text-center text-xs font-medium">
                    Top
                  </div>
                )}
                <div
                  className="grid gap-2 rounded-lg border bg-muted/20 p-3"
                  style={{ gridTemplateColumns: layoutPreviewColumns(layout.type) }}
                >
                  {layout.activeRegions.map((regionId) => (
                    <div
                      key={regionId}
                      className="rounded bg-card px-3 py-8 text-center text-xs font-medium"
                    >
                      {getCompositionRegionLabel(regionId, isRtl)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 font-medium">{layout.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{layout.editorDescription}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout Settings</CardTitle>
          <CardDescription>
            Configure spacing, width presets, responsive stacking, and sticky sidebars.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-3 rounded-lg border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={topEnabled}
                onChange={(e) =>
                  patchLayout({
                    topSection: {
                      enabled: e.target.checked,
                      width: composition.layout.topSection?.width ?? "boxed",
                    },
                  })
                }
              />
              Enable top section
            </label>
            {topEnabled && (
              <div>
                <label className="mb-2 block text-sm font-medium">Top section width</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={composition.layout.topSection?.width ?? "boxed"}
                  onChange={(e) =>
                    patchLayout({
                      topSection: {
                        enabled: true,
                        width: e.target.value as "full" | "boxed",
                      },
                    })
                  }
                >
                  <option value="full">Full bleed</option>
                  <option value="boxed">Boxed (same max width)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Gap</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={composition.layout.spacing.gap ?? "md"}
              onChange={(e) =>
                patchLayout({
                  spacing: {
                    ...composition.layout.spacing,
                    gap: e.target.value as Composition["layout"]["spacing"]["gap"],
                  },
                })
              }
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Max Width</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={composition.layout.spacing.maxWidth ?? "page"}
              onChange={(e) =>
                patchLayout({
                  spacing: {
                    ...composition.layout.spacing,
                    maxWidth: e.target.value as Composition["layout"]["spacing"]["maxWidth"],
                  },
                })
              }
            >
              <option value="full">Full</option>
              <option value="page">Page</option>
              <option value="wide">Wide</option>
              <option value="narrow">Narrow</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Vertical Align</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={composition.layout.verticalAlign ?? "stretch"}
              onChange={(e) =>
                patchLayout({
                  verticalAlign: e.target.value as Composition["layout"]["verticalAlign"],
                })
              }
            >
              <option value="start">Top</option>
              <option value="center">Center</option>
              <option value="end">Bottom</option>
              <option value="stretch">Stretch</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Column Ratio</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={currentRatio}
              onChange={(e) =>
                patchLayout({
                  regions: {
                    ...composition.layout.regions,
                    asideStart: {
                      ...composition.layout.regions.asideStart,
                      ratio: e.target.value as ColumnRatioToken,
                    },
                    asideEnd: {
                      ...composition.layout.regions.asideEnd,
                      ratio: e.target.value as ColumnRatioToken,
                    },
                  },
                })
              }
            >
              <option value="equal">Equal</option>
              <option value="20-80">20 / 80</option>
              <option value="25-75">25 / 75</option>
              <option value="30-70">30 / 70</option>
              <option value="20-60-20">20 / 60 / 20</option>
              <option value="25-50-25">25 / 50 / 25</option>
              <option value="golden">Golden</option>
            </select>
          </div>

          {current.supportsStickyAside && (hasAsideStart || hasAsideEnd) && (
            <div className="md:col-span-2 space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Sticky columns</p>
              {hasAsideStart && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={composition.layout.regions.asideStart?.sticky === true}
                    onChange={(e) => patchRegionSticky("asideStart", e.target.checked)}
                  />
                  Sticky {getCompositionRegionLabel("asideStart", isRtl).toLowerCase()}
                </label>
              )}
              {hasAsideEnd && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={composition.layout.regions.asideEnd?.sticky === true}
                    onChange={(e) => patchRegionSticky("asideEnd", e.target.checked)}
                  />
                  Sticky {getCompositionRegionLabel("asideEnd", isRtl).toLowerCase()}
                </label>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium">Scroll behavior</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={composition.layout.stickyScroll ?? "document"}
                  onChange={(e) =>
                    patchLayout({
                      stickyScroll: e.target.value as Composition["layout"]["stickyScroll"],
                    })
                  }
                >
                  <option value="document">Document scroll (default)</option>
                  <option value="main-only">Main column only</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Regions</CardTitle>
          <CardDescription>These are the content areas available for the current layout.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {editableRegions.map((regionId: RegionId) => (
            <Button key={regionId} type="button" size="sm" variant="outline">
              {getCompositionRegionLabel(regionId, isRtl)}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
