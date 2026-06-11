"use client";

import { useMemo, useState } from "react";
import type { Product } from "../../types";

type Props = {
  product: Product;
  dateLocale?: string;
};

export function ProductReviewsSection({ product, dateLocale = "en" }: Props) {
  const reviews = product.reviews;
  const breakdown = reviews?.breakdown ?? {};
  const comments = reviews?.comments ?? [];

  const totalReviews = Math.max(0, Math.floor(Number(reviews?.count ?? 0) || 0));
  const averageRating = Number.isFinite(Number(reviews?.rating)) ? Number(reviews?.rating) : 0;

  const rows = [
    { label: "5★", value: breakdown["5_star"] ?? 0 },
    { label: "4★", value: breakdown["4_star"] ?? 0 },
    { label: "3★", value: breakdown["3_star"] ?? 0 },
    { label: "2★", value: breakdown["2_star"] ?? 0 },
    { label: "1★", value: breakdown["1_star"] ?? 0 },
  ];

  const percent = (part: number) => {
    if (totalReviews <= 0) return "0%";
    return `${Math.round((part / totalReviews) * 100)}%`;
  };

  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(10);

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    sorted.sort((a, b) => {
      const ta = new Date(a.date || 0).getTime();
      const tb = new Date(b.date || 0).getTime();
      return sortBy === "newest" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [comments, sortBy]);

  const visible = sortedComments.slice(0, visibleCount);
  const isTrustpilot = (reviews?.source ?? "").toLowerCase() === "trustpilot";

  return (
    <div className="space-y-6">
      {isTrustpilot ? (
        <p className="text-xs text-muted-foreground border rounded-md px-3 py-2">
          Reviews powered by Trustpilot
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[auto_1fr] items-start">
        <div className="text-center md:text-left">
          <p className="text-4xl font-semibold">{averageRating.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">out of 5</p>
          <p className="text-xs text-muted-foreground mt-1">{totalReviews} reviews</p>
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-sm">
              <span className="w-8 text-muted-foreground">{row.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: percent(row.value) }}
                />
              </div>
              <span className="w-10 text-xs text-muted-foreground text-right">{percent(row.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {comments.length > 1 ? (
        <label className="flex items-center gap-2 text-sm">
          Sort by
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      ) : null}

      <div className="space-y-4">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          visible.map((comment, index) => (
            <article key={index} className="rounded-lg border p-4">
              <header className="flex justify-between gap-2 text-sm mb-2">
                <strong>{comment.name ?? "Anonymous"}</strong>
                {comment.date ? (
                  <time className="text-muted-foreground text-xs" dateTime={comment.date}>
                    {new Date(comment.date).toLocaleDateString(dateLocale)}
                  </time>
                ) : null}
              </header>
              <p className="text-sm text-muted-foreground leading-relaxed">{comment.text ?? ""}</p>
              {comment.photos?.length ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {comment.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {visibleCount < sortedComments.length ? (
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => setVisibleCount((n) => n + 10)}
        >
          Load more reviews
        </button>
      ) : null}
    </div>
  );
}