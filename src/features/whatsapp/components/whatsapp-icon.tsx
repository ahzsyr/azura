"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { hasMediaUrl } from "@/features/media/constants";
import { cn } from "@/lib/utils";
import type { WhatsAppButtonSize } from "@/features/whatsapp/whatsapp.schema";

type Props = {
  iconUrl?: string | null;
  iconSize?: string;
  size?: WhatsAppButtonSize;
  className?: string;
  alt?: string;
};

const FAB_ICON_SIZE: Record<WhatsAppButtonSize, string> = {
  sm: "1.25rem",
  md: "1.75rem",
  lg: "2rem",
};

export function WhatsAppIcon({
  iconUrl,
  iconSize,
  size = "md",
  className,
  alt = "WhatsApp",
}: Props) {
  const resolvedSize = iconSize?.trim() || FAB_ICON_SIZE[size];

  if (hasMediaUrl(iconUrl)) {
    const url = iconUrl!.trim();
    const isSvg = url.toLowerCase().endsWith(".svg");

    if (isSvg) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className={cn("shrink-0 object-contain", className)}
          style={{ width: resolvedSize, height: resolvedSize }}
        />
      );
    }

    return (
      <Image
        src={url}
        alt={alt}
        width={28}
        height={28}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        unoptimized
      />
    );
  }

  return (
    <MessageCircle
      className={cn("shrink-0", className)}
      style={{ width: resolvedSize, height: resolvedSize }}
      aria-hidden
    />
  );
}
