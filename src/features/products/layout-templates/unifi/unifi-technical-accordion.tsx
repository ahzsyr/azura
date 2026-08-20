"use client";

import { useState } from "react";
import type { Product } from "@/features/products/types";
import type { PdpLabels } from "@/features/products/pdp/load-pdp-labels";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import { nestedSpecRows } from "@/features/products/lib/product-spec-rows";

type Props = {
  product: Product;
  labels: PdpLabels;
  display?: ResolvedProductPageDisplay;
};

export function UniFiTechnicalAccordion({ product, labels, display }: Props) {
  const groups = (product.specifications ?? []).filter((group) => nestedSpecRows(group).length > 0);
  const [openIndex, setOpenIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const guide = (product.documents ?? []).find((doc) => doc.url);

  if (groups.length === 0) {
    return <p className="unifi-empty">{labels.specifications || "No specifications available."}</p>;
  }

  return (
    <div className="unifi-technical">
      <div className="unifi-technical__toolbar">
        {display?.compare.enabled ? (
          <label className="unifi-technical__compare">
            Compare
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          </label>
        ) : null}
        {guide?.url ? (
          <a href={guide.url} target="_blank" rel="noopener noreferrer" className="unifi-technical__guide">
            {guide.title || "Installation Guide"}
          </a>
        ) : null}
      </div>
      {groups.map((group, groupIndex) => {
        const rows = nestedSpecRows(group);
        const heading = group.technology || labels.specifications || "Specifications";
        const isOpen = openIndex === groupIndex;
        return (
          <div key={`${heading}-${groupIndex}`} className="unifi-technical__group">
            <button
              type="button"
              className="unifi-technical__heading"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? -1 : groupIndex)}
            >
              {heading}
              <span className="unifi-technical__chevron" aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
            </button>
            {isOpen ? (
              <dl className="unifi-technical__list">
                {rows.map((row, i) => (
                  <div
                    key={`${row.item.name}-${i}`}
                    className={`unifi-technical__row${row.isGroup ? " unifi-technical__row--group" : ""}${row.depth ? " unifi-technical__row--child" : ""}`}
                  >
                    <dt>{row.item.name}</dt>
                    <dd>{row.item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        );
      })}
      {compare ? (
        <p className="unifi-empty">Select another product from Compare to view a side-by-side spec table.</p>
      ) : null}
    </div>
  );
}
