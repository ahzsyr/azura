import type { Product } from "../../types";
import { rowsForGroup } from "../../lib/product-spec-rows";

type Props = {
  product: Product;
  emptyLabel?: string;
};

export function ProductSpecsTable({ product, emptyLabel = "No specifications available for this product." }: Props) {
  const specs = product.specifications ?? [];
  const groups = specs.filter((group) => rowsForGroup(group).length > 0);

  if (groups.length === 0) {
    return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
  }

  return (
    <div className="prd-specs">
      {groups.map((group, idx) => {
        const rows = rowsForGroup(group);
        const title = group.technology || "Specifications";
        return (
          <details key={idx} className="prd-specs__group" open={idx === 0}>
            <summary className="prd-specs__summary">{title}</summary>
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
          </details>
        );
      })}
    </div>
  );
}
