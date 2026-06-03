"use client";

import { useStore } from "@nanostores/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { HeaderRenderer, type HeaderMenuPreviewMode } from "@/features/navigation/components/header/HeaderRenderer";
import { enrichHeaderWorkspaceWithMegaCardImagesSync } from "@/features/navigation/mega-menu-card-images";
import { $workspace } from "@/features/navigation/header-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PreviewDevice = "desktop" | "mobile";

export function PreviewPanel({ localeCode }: { localeCode: string }) {
  const raw = useStore($workspace);
  const workspace = useMemo(
    () => enrichHeaderWorkspaceWithMegaCardImagesSync(raw, localeCode),
    [raw, localeCode]
  );
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [menuPreviewMode, setMenuPreviewMode] = useState<HeaderMenuPreviewMode>("live");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;

    const blockNav = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (anchor && root.contains(anchor)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    root.addEventListener("click", blockNav, true);
    return () => root.removeEventListener("click", blockNav, true);
  }, []);

  return (
    <div ref={previewRef} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {menuPreviewMode === "live"
            ? "Showing menus assigned in Menu Manager."
            : "Showing the menu open in Menu Builder."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border overflow-hidden" role="group" aria-label="Menu preview source">
            <Button
              type="button"
              size="sm"
              variant={menuPreviewMode === "live" ? "default" : "ghost"}
              className="rounded-none"
              onClick={() => setMenuPreviewMode("live")}
            >
              Live menus
            </Button>
            <Button
              type="button"
              size="sm"
              variant={menuPreviewMode === "editing" ? "default" : "ghost"}
              className="rounded-none border-s"
              onClick={() => setMenuPreviewMode("editing")}
            >
              Editing menu
            </Button>
          </div>
          <div className="inline-flex gap-1" role="group" aria-label="Preview device">
            <Button
              type="button"
              size="sm"
              variant={device === "desktop" ? "default" : "outline"}
              onClick={() => setDevice("desktop")}
              aria-label="Desktop preview"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={device === "mobile" ? "default" : "outline"}
              onClick={() => setDevice("mobile")}
              aria-label="Mobile preview"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "hb-preview-frame max-h-[220px] overflow-auto rounded-xl border bg-muted/30",
          device === "mobile" && "hb-preview-frame--mobile max-w-[390px] mx-auto"
        )}
      >
        <HeaderRenderer
          workspace={workspace}
          localeCode={localeCode}
          canSwitchLocale={false}
          searchEnabled={true}
          surface="preview"
          menuPreviewMode={menuPreviewMode}
        />
      </div>
    </div>
  );
}
