"use client";

import type { CompareItemSnapshot, CompareRowEntry } from "@/features/comparison/types";
import { compareItemTitle } from "@/features/comparison/lib/compare-locale";
import { ComparisonFieldRenderer } from "@/features/comparison/comparison-field-renderer";

type Props = {
  items: CompareItemSnapshot[];
  entries: CompareRowEntry[];
  locale: string;
  specificationsLabel: string;
};

export function ComparisonTable({ items, entries, locale, specificationsLabel }: Props) {
  if (entries.length === 0) return null;

  const titleFor = (item: CompareItemSnapshot) => compareItemTitle(item, locale);

  return (
    <section className="cmp-specs" aria-labelledby="cmp-specs-heading">
      <h2 id="cmp-specs-heading" className="cmp-specs__title">
        {specificationsLabel}
      </h2>
      <div className="cmp-table-wrap" role="region" aria-label={specificationsLabel} tabIndex={0}>
        <table className="cmp-table">
          <thead className="cmp-table__head">
            <tr>
              <th scope="col" className="cmp-table__corner" />
              {items.map((item) => (
                <th key={item.id} scope="col" className="cmp-table__col-head">
                  {titleFor(item)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <ComparisonFieldRenderer
                key={
                  entry.type === "group"
                    ? `g-${entry.group}-${idx}`
                    : `r-${entry.group}-${entry.key}-${idx}`
                }
                entry={entry}
                columnCount={items.length}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
