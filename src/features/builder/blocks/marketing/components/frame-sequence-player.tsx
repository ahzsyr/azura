"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { FrameSequence } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { defaultVisualLayerAnimation } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { buildVisualLayerMotion } from "@/features/builder/blocks/marketing/lib/visual-layer-motion";
import { cn } from "@/lib/utils";

type Props = {
  sequence: FrameSequence;
  isActive: boolean;
  className?: string;
};

export function FrameSequencePlayer({ sequence, isActive, className }: Props) {
  const reduceMotion = useReducedMotion();
  const frames = sequence.frames.filter((frame) => frame.imageUrl);
  const [frameIndex, setFrameIndex] = useState(0);
  const animation = sequence.animation ?? defaultVisualLayerAnimation();
  const motionProps = buildVisualLayerMotion(animation, {
    reduceMotion: Boolean(reduceMotion) || !isActive,
  });

  useEffect(() => {
    setFrameIndex(0);
  }, [sequence.id]);

  useEffect(() => {
    if (!isActive || reduceMotion || frames.length <= 1) return;

    const intervalMs = 1000 / Math.max(sequence.fps, 1);
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next >= frames.length) {
          return sequence.loop ? 0 : current;
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [frames.length, isActive, reduceMotion, sequence.fps, sequence.loop]);

  if (frames.length === 0) return null;

  const activeFrame = frames[Math.min(frameIndex, frames.length - 1)];

  return (
    <motion.div
      className={cn("pointer-events-none absolute", className)}
      style={{
        left: `${sequence.x}%`,
        top: `${sequence.y}%`,
        width: sequence.width ? `${sequence.width}%` : undefined,
        height: sequence.height ? `${sequence.height}%` : undefined,
        zIndex: sequence.zIndex,
        transformOrigin: "top left",
      }}
      initial={motionProps.initial}
      animate={isActive ? motionProps.animate : motionProps.initial || motionProps.animate}
      transition={motionProps.transition}
    >
      <Image
        src={activeFrame.imageUrl}
        alt=""
        width={800}
        height={600}
        className="h-auto w-full object-contain"
        unoptimized={activeFrame.imageUrl.endsWith(".webp")}
      />
    </motion.div>
  );
}
