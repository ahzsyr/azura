"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type {
  ImageMediaGap,
  ImageMediaPosition,
  ImageMediaWidth,
  ImageMobileLayout,
} from "@/features/builder/blocks/content/lib/image-block-model";

const POSITIONS: { value: ImageMediaPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "overlay", label: "Overlay" },
  { value: "background", label: "Background" },
];

const MOBILE: { value: ImageMobileLayout; label: string }[] = [
  { value: "stack", label: "Stack" },
  { value: "reverse", label: "Reverse" },
  { value: "side-by-side", label: "Side by Side" },
];

const WIDTHS: { value: ImageMediaWidth; label: string }[] = [
  { value: "1/3", label: "1/3" },
  { value: "2/5", label: "2/5" },
  { value: "1/2", label: "1/2" },
  { value: "3/5", label: "3/5" },
  { value: "2/3", label: "2/3" },
];

const GAPS: { value: ImageMediaGap; label: string }[] = [
  { value: "none", label: "None" },
  { value: "sm", label: "SM" },
  { value: "md", label: "MD" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
];

type Props = {
  mediaPosition: ImageMediaPosition;
  mobileLayout: ImageMobileLayout;
  mediaWidth: ImageMediaWidth;
  mediaGap: ImageMediaGap;
  onChange: (patch: Record<string, string>) => void;
};

export function ImageLayoutControls({
  mediaPosition,
  mobileLayout,
  mediaWidth,
  mediaGap,
  onChange,
}: Props) {
  const isSide = mediaPosition === "left" || mediaPosition === "right";
  const isNormal =
    mediaPosition === "top" ||
    mediaPosition === "bottom" ||
    mediaPosition === "left" ||
    mediaPosition === "right";

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Image position</Label>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {POSITIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1.5 text-xs transition-colors",
                mediaPosition === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
              onClick={() => onChange({ mediaPosition: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isSide ? (
        <>
          <div>
            <Label className="text-xs">Mobile layout</Label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {MOBILE.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs transition-colors",
                    mobileLayout === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => onChange({ mobileLayout: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Image width</Label>
            <div className="mt-1 grid grid-cols-5 gap-1.5">
              {WIDTHS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "rounded-md border px-1 py-1.5 text-[10px] transition-colors",
                    mediaWidth === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => onChange({ mediaWidth: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {isNormal ? (
        <div>
          <Label className="text-xs">Gap (media ↔ content)</Label>
          <div className="mt-1 grid grid-cols-5 gap-1.5">
            {GAPS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs transition-colors",
                  mediaGap === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
                onClick={() => onChange({ mediaGap: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
