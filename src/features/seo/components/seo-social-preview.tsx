"use client";

import Image from "next/image";
import { getDirection } from "@/i18n/routing";
import { getSiteDomain } from "@/config/site";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  title: string;
  description: string;
  ogImage?: string;
  locale: "en" | "ar";
};

export function SeoSocialPreview({ title, description, ogImage, locale }: Props) {
  const image = ogImage?.trim() || DEFAULT_MEDIA_PLACEHOLDER;

  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Social preview ({locale.toUpperCase()})
      </p>
      <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="relative aspect-[1.91/1] w-full bg-muted">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" unoptimized />
          ) : null}
        </div>
        <div className="space-y-1 p-3" dir={getDirection(locale)}>
          <p className="text-xs text-muted-foreground uppercase">{getSiteDomain()}</p>
          <p className="line-clamp-1 font-semibold text-sm">{title || "Page title"}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description || "Meta description appears here."}
          </p>
        </div>
      </div>
      <div className="rounded-lg border bg-background p-3 text-sm">
        <p className="text-xs text-muted-foreground mb-1">Twitter / X card</p>
        <p className="font-medium line-clamp-1">{title || "Page title"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
