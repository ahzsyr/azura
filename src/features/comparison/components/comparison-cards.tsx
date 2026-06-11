"use client";

import Link from "next/link";
import type { CompareItemSnapshot } from "@/features/comparison/types";

type Props = {
  items: CompareItemSnapshot[];
  locale: string;
  removeLabel: string;
  onRemove: (id: string) => void;
  /** When true, first column is a spacer matching the spec table label column */
  alignWithTable?: boolean;
};

export function ComparisonCards({
  items,
  locale,
  removeLabel,
  onRemove,
  alignWithTable = false,
}: Props) {
  const count = Math.min(Math.max(items.length, 1), 4);

  return (
    <div
      className={`cmp-cards cmp-cards--count-${count}${alignWithTable ? " cmp-cards--aligned" : ""}`}
      aria-label="Compared items"
    >
      {alignWithTable ? <div className="cmp-cards__gutter" aria-hidden="true" /> : null}
      {items.map((item) => {
        const title = locale.startsWith("ar") ? item.titleAr : item.titleEn;
        return (
          <article key={item.id} className="cmp-card" data-compare-card>
            <button
              type="button"
              className="cmp-card__remove"
              aria-label={`${removeLabel}: ${title}`}
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
            <div className="cmp-card__media">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="cmp-card__img"
                  decoding="async"
                  data-skip-img-fade
                />
              ) : (
                <span className="cmp-card__placeholder" aria-hidden="true" />
              )}
            </div>
            <div className="cmp-card__body">
              <p className="cmp-card__title">
                <Link href={item.href}>{title}</Link>
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
