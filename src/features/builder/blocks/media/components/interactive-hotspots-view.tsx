"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HotspotItem } from "@/features/builder/blocks/media/schemas/media-blocks";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  hotspots: HotspotItem[];
  interaction?: "click" | "hover";
  panelStyle?: "tooltip" | "popover" | "drawer";
  locale: string;
};

export function InteractiveHotspotsView({
  title,
  subtitle,
  imageUrl,
  hotspots,
  interaction = "click",
  panelStyle = "popover",
  locale,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = hotspots.find((h) => h.id === activeId);

  const openHotspot = (id: string) => {
    if (panelStyle === "drawer" || interaction === "click") {
      setActiveId(id);
    }
  };

  const closeHotspot = () => setActiveId(null);

  return (
    <div>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      <div className={cn("relative mx-auto max-w-4xl overflow-hidden rounded-xl", title ? "mt-8" : undefined)}>
        {imageUrl ? (
          <div className="relative aspect-[16/10] w-full">
            <Image src={imageUrl} alt={title ?? "Interactive image"} fill className="object-cover" sizes="(max-width:768px) 100vw, 900px" />
            {hotspots.map((spot) => {
              const label = getLocalizedField(spot, "label", locale) || "Hotspot";
              const content = getLocalizedField(spot, "content", locale);
              const isActive = activeId === spot.id;

              return (
                <div
                  key={spot.id}
                  className="absolute"
                  style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <button
                    type="button"
                    aria-label={label}
                    aria-expanded={isActive}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent text-xs font-bold text-accent-foreground shadow-lg transition hover:scale-110",
                      isActive && "ring-2 ring-white ring-offset-2 ring-offset-accent"
                    )}
                    onClick={() => openHotspot(spot.id)}
                    onMouseEnter={() => {
                      if (interaction === "hover" && panelStyle !== "drawer") setActiveId(spot.id);
                    }}
                    onMouseLeave={() => {
                      if (interaction === "hover" && panelStyle !== "drawer") setActiveId(null);
                    }}
                  >
                    +
                  </button>
                  {panelStyle === "tooltip" && isActive && content && (
                    <div
                      className={cn(
                        "absolute z-20 w-48 rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md",
                        spot.tooltipPlacement === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
                        spot.tooltipPlacement === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
                        spot.tooltipPlacement === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
                        (spot.tooltipPlacement === "top" || !spot.tooltipPlacement) && "bottom-full left-1/2 mb-2 -translate-x-1/2"
                      )}
                    >
                      <p className="font-medium">{label}</p>
                      <p className="mt-1 text-muted-foreground">{content}</p>
                    </div>
                  )}
                  {panelStyle === "popover" && isActive && content && (
                    <div className="absolute left-full top-1/2 z-20 ml-2 hidden w-56 -translate-y-1/2 rounded-lg border bg-card p-3 text-sm shadow-lg sm:block">
                      <p className="font-medium">{label}</p>
                      <p className="mt-1 text-muted-foreground">{content}</p>
                      {spot.href && (
                        <a href={spot.href} className="mt-2 inline-block text-xs text-primary hover:underline">
                          Learn more
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            Add a base image in the block settings
          </div>
        )}
      </div>

      <Dialog open={panelStyle === "drawer" && Boolean(active)} onOpenChange={(v) => !v && closeHotspot()}>
        <DialogContent className="sm:max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{getLocalizedField(active, "label", locale)}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {getLocalizedField(active, "content", locale)}
              </p>
              {active.mediaUrl && (
                <div className="relative mt-3 aspect-video overflow-hidden rounded-lg">
                  <Image src={active.mediaUrl} alt="" fill className="object-cover" sizes="400px" />
                </div>
              )}
              {active.href && (
                <a href={active.href} className="mt-3 inline-block text-sm text-primary hover:underline">
                  Learn more
                </a>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {panelStyle === "popover" && interaction === "click" && active && (
        <div className="mt-4 rounded-lg border bg-card p-4 sm:hidden">
          <p className="font-medium">{getLocalizedField(active, "label", locale)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{getLocalizedField(active, "content", locale)}</p>
        </div>
      )}
    </div>
  );
}
