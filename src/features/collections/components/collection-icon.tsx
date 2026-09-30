"use client";

import { Icon } from "@/features/icons/components/icon";
import { isCollectionImageSrc } from "@/features/collections/collection-navigation";

type Props = {
  src: string;
  className?: string;
  alt?: string;
};

export function CollectionIcon({ src, className, alt = "" }: Props) {
  if (isCollectionImageSrc(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }
  return <Icon iconId={src} className={className ?? "h-7 w-7"} />;
}
