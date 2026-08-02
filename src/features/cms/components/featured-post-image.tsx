import Image from "next/image";
import type { PostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { resolveFeaturedImageDisplay } from "@/lib/featured-image-display";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  alt: string;
  settings?: PostFeaturedImageSettings | unknown;
  caption?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  sharedAttrs?: Record<string, string | undefined>;
};

export function FeaturedPostImage({
  url,
  alt,
  settings,
  caption,
  priority = false,
  sizes = "900px",
  className,
  imageClassName,
  sharedAttrs,
}: Props) {
  const display = resolveFeaturedImageDisplay(settings);

  return (
    <figure className={cn("space-y-2", className)}>
      <div
        className={cn(display.containerClassName, "rounded-xl")}
        {...sharedAttrs}
      >
        <Image
          src={url}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn(display.imageClassName, imageClassName)}
          style={{ objectPosition: display.objectPosition }}
        />
      </div>
      {caption ? (
        <figcaption className="text-sm text-muted-foreground text-center">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
