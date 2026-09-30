"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { TabbedShowcaseVisual } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { defaultVisualLayerAnimation } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { FrameSequencePlayer } from "@/features/builder/blocks/marketing/components/frame-sequence-player";
import { buildVisualLayerMotion } from "@/features/builder/blocks/marketing/lib/visual-layer-motion";
import { cn } from "@/lib/utils";

type Props = {
  visual: TabbedShowcaseVisual;
  isActive: boolean;
  className?: string;
};

function parseAspectRatio(ratio: string): string {
  const [widthRaw, heightRaw] = ratio.split("/");
  const width = Number(widthRaw);
  const height = Number(heightRaw);
  if (width > 0 && height > 0) return `${width}/${height}`;
  return "980/780";
}

export function CompositeVisualStage({ visual, isActive, className }: Props) {
  const reduceMotion = useReducedMotion();
  const aspectRatio = parseAspectRatio(visual.stageAspectRatio);
  const layers = [...visual.layers]
    .filter((layer) => layer.imageUrl)
    .sort((a, b) => a.zIndex - b.zIndex);
  const sequences = [...visual.sequences].sort((a, b) => a.zIndex - b.zIndex);
  const hasContent = layers.length > 0 || sequences.some((seq) => seq.frames.some((f) => f.imageUrl));

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      {!hasContent ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
          Add visual layers
        </div>
      ) : null}

      {layers.map((layer) => {
        const animation = layer.animation ?? defaultVisualLayerAnimation();
        const motionProps = buildVisualLayerMotion(animation, {
          reduceMotion: Boolean(reduceMotion) || !isActive,
          baseOpacity: layer.opacity,
          baseScale: layer.scale,
        });

        return (
          <motion.div
            key={layer.id}
            className="pointer-events-none absolute"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: layer.width ? `${layer.width}%` : undefined,
              height: layer.height ? `${layer.height}%` : undefined,
              zIndex: layer.zIndex,
              transformOrigin: "top left",
            }}
            initial={motionProps.initial}
            animate={isActive ? motionProps.animate : motionProps.initial || motionProps.animate}
            transition={motionProps.transition}
          >
            <Image
              src={layer.imageUrl}
              alt=""
              width={800}
              height={600}
              className="h-auto w-full object-contain"
              unoptimized={layer.imageUrl.endsWith(".webp")}
            />
          </motion.div>
        );
      })}

      {sequences.map((sequence) => (
        <FrameSequencePlayer key={sequence.id} sequence={sequence} isActive={isActive} />
      ))}
    </div>
  );
}
