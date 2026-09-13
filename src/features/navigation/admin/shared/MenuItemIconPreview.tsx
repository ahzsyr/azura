"use client";

import { Link2 } from "lucide-react";
import { NavMenuGlyph } from "@/features/navigation/components/header/NavMenuGlyph";
import { resolveMediaUrl } from "@/features/media/constants";
import { cn } from "@/lib/utils";

type Props = {
  icon?: string | null;
  /** Linked catalog image (e.g. brand logo) when no Font Awesome / iconId is set. */
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

/** Renders MenuItem.icon (FA class or iconId), else imageUrl — tree/inspector/flyout. */
export function MenuItemIconPreview({ icon, imageUrl, className, fallbackClassName }: Props) {
  const v = icon?.trim();
  if (v) {
    return <NavMenuGlyph icon={v} className={cn("h-4 w-4 text-muted-foreground", className)} />;
  }

  const img = imageUrl?.trim();
  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveMediaUrl(img)}
        alt=""
        className={cn("h-4 w-4 object-contain", className)}
        decoding="async"
        aria-hidden
      />
    );
  }

  return <Link2 className={cn("h-4 w-4 text-muted-foreground", fallbackClassName, className)} aria-hidden />;
}
