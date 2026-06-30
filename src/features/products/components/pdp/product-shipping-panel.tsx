import { resolveDeliveryOptionsForProduct } from "../../lib/product-delivery";
import type { Product } from "../../types";

type Props = {
  product: Product;
  emptyLabel?: string;
};

export function ProductShippingPanel({ product, emptyLabel = "Shipping information is not available for this product." }: Props) {
  const options = resolveDeliveryOptionsForProduct(product);

  if (options.length === 0) {
    return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
  }

  return (
    <div className="prd-ship-list">
      {options.map((option) => (
        <article key={option.id} className="prd-ship-card">
          <strong>{option.label}</strong>
          {option.time ? <p>{option.time}</p> : null}
          {option.price ? <span>{option.price}</span> : null}
        </article>
      ))}
    </div>
  );
}
