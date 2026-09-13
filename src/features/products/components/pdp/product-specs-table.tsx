import type { Product } from "../../types";
import { rowsForGroup } from "../../lib/product-spec-rows";
import { ProductSectionAccordion } from "./product-section-accordion";

type Props = {
  product: Product;
  emptyLabel?: string;
};

export function ProductSpecsTable({ product, emptyLabel = "No specifications available for this product." }: Props) {
  const specs = product.source_specifications?.length
    ? product.source_specifications
    : product.specifications ?? [];
  const groups = specs.filter((group) => rowsForGroup(group).length > 0);

  if (groups.length === 0) {
    return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
  }

  return (
    <ProductSectionAccordion
      items={groups.map((group, idx) => {
        const rows = rowsForGroup(group);
        const title = group.technology || "Specifications";
        return {
          id: `${title}-${idx}`,
          title,
          content: (
            <dl className="prd-specs__rows">
              {rows.map((row, rowIdx) => {
                const value = row.value?.toString() ?? "";
                const isUrl = /^https?:\/\//i.test(value);
                return (
                  <div key={rowIdx} className="prd-specs__row">
                    <dt>{row.name || "—"}</dt>
                    <dd>
                      {isUrl ? (
                        <a href={value} target="_blank" rel="noopener noreferrer">
                          {value}
                        </a>
                      ) : (
                        value || "—"
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ),
        };
      })}
    />
  );
}
