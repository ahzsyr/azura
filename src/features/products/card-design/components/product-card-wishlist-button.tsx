"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isInSavedList, toggleSavedList } from "@/features/products/lib/product-lists";

type Props = {
  productId: string;
  className?: string;
};

export function ProductCardWishlistButton({ productId, className = "" }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isInSavedList(productId));
  }, [productId]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = toggleSavedList(productId);
      setSaved(next);
    },
    [productId],
  );

  return (
    <button
      type="button"
      className={`pl-card__wishlist${saved ? " is-saved" : ""} ${className}`.trim()}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      onClick={onClick}
    >
      <Heart size={16} strokeWidth={2} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
