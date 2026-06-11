"use client";

import { waitUntilVisible } from "@/lib/performance/wait-until-visible";

const HIGHLIGHT_CLASS = "prd-reviews--highlight";
const HIGHLIGHT_MS = 2000;

export function highlightProductReviews(): void {
  const el = document.querySelector("[data-product-reviews]");
  if (!el) return;
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
}

export async function navigateToProductReviews(): Promise<void> {
  window.dispatchEvent(
    new CustomEvent("product:tab-change", { detail: { key: "reviews" } }),
  );
  document.getElementById("prd-tab-reviews")?.focus({ preventScroll: true });

  const tabs = document.querySelector(".prd-page__tabs");
  const reviews = document.querySelector("[data-product-reviews]");
  const target = tabs ?? reviews;
  if (target) {
    await waitUntilVisible(target, 800);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  highlightProductReviews();
}

type ProductReviewsLinkProps = {
  reviewCount: number;
  reviewsLabel: string;
  className?: string;
};

export function ProductReviewsLink({
  reviewCount,
  reviewsLabel,
  className = "prd-info__review-count",
}: ProductReviewsLinkProps) {
  return (
    <button
      type="button"
      className={className}
      data-scroll-to-reviews
      onClick={() => {
        void navigateToProductReviews();
      }}
    >
      ({reviewCount} {reviewsLabel})
    </button>
  );
}
