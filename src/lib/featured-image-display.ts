import type {
  FeaturedImageAspectRatio,
  FeaturedImageFocalPoint,
  FeaturedImageObjectFit,
  PostFeaturedImageSettings,
} from "@/schemas/featured-image-settings";
import { mergePostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { cn } from "@/lib/utils";

export function getFeaturedImageAspectClass(aspectRatio: FeaturedImageAspectRatio): string {
  switch (aspectRatio) {
    case "16:9":
      return "aspect-video";
    case "4:3":
      return "aspect-[4/3]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-auto min-h-[12rem]";
  }
}

export function getFeaturedImageObjectFitClass(objectFit: FeaturedImageObjectFit): string {
  return objectFit === "contain" ? "object-contain" : "object-cover";
}

export function getFeaturedImageObjectPosition(focalPoint: FeaturedImageFocalPoint): string {
  switch (focalPoint) {
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "left":
      return "left";
    case "right":
      return "right";
    default:
      return "center";
  }
}

export function resolveFeaturedImageDisplay(settings?: PostFeaturedImageSettings | unknown) {
  const merged = mergePostFeaturedImageSettings(
    (settings ?? {}) as Partial<PostFeaturedImageSettings>,
  );
  return {
    settings: merged,
    containerClassName: cn("relative overflow-hidden", getFeaturedImageAspectClass(merged.aspectRatio!)),
    imageClassName: cn("h-full w-full", getFeaturedImageObjectFitClass(merged.objectFit!)),
    objectPosition: getFeaturedImageObjectPosition(merged.focalPoint!),
  };
}
