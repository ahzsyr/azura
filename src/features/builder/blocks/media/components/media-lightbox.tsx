"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmbedVideoPlayer } from "@/features/builder/blocks/media/components/embed-video-player";
import { isEmbedUrl } from "@/features/builder/blocks/media/lib/embed-video";
import { cn } from "@/lib/utils";

export type LightboxItem = {
  id: string;
  src: string;
  embedUrl?: string;
  alt?: string;
  caption?: string;
  kind?: "IMAGE" | "VIDEO";
};

type Props = {
  items: LightboxItem[];
  openIndex: number | null;
  onClose: () => void;
};

export function MediaLightbox({ items, openIndex, onClose }: Props) {
  const [index, setIndex] = useState(openIndex ?? 0);

  useEffect(() => {
    if (openIndex !== null) setIndex(openIndex);
  }, [openIndex]);

  const open = openIndex !== null && items.length > 0;
  const item = items[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  if (!item) return null;

  const videoSrc = item.embedUrl || item.src;
  const isVideo = item.kind === "VIDEO" || isEmbedUrl(videoSrc) || /\.(mp4|webm|ogg)(\?|$)/i.test(videoSrc);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl border-0 bg-black/95 p-0 text-white sm:rounded-xl">
        <DialogTitle className="sr-only">{item.alt ?? item.caption ?? "Media"}</DialogTitle>
        <div className="relative flex min-h-[50vh] flex-col">
          {items.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                onClick={goPrev}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                onClick={goNext}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
          <div className={cn("relative flex flex-1 items-center justify-center p-4", isVideo ? "aspect-video min-h-[40vh]" : "min-h-[50vh]")}>
            {isVideo ? (
              <div className="h-full w-full max-h-[80vh]">
                <EmbedVideoPlayer url={videoSrc} title={item.alt ?? "Video"} controls autoplay />
              </div>
            ) : (
              <div className="relative h-[70vh] w-full max-w-4xl">
                <Image src={item.src} alt={item.alt ?? ""} fill className="object-contain" sizes="90vw" priority />
              </div>
            )}
          </div>
          {item.caption && (
            <p className="border-t border-white/10 px-4 py-3 text-center text-sm text-white/80">{item.caption}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
