import type { Product, ProductDetailedSection } from "../../types";

type Props = {
  sections: ProductDetailedSection[];
  description?: string;
  shortDescription?: string;
  emptyLabel?: string;
};

export function ProductDescriptionPanel({
  sections,
  description,
  shortDescription,
  emptyLabel = "No description for this product yet.",
}: Props) {
  const hasSections = sections.some((s) => (s.heading?.trim() || s.text?.trim()).length > 0);

  if (hasSections) {
    return (
      <div className="prd-desc">
        {sections.map((block, idx) => (
          <section key={idx} className="prd-desc__block">
            {block.heading?.trim() ? (
              <h3 className="prd-desc__heading">{block.heading.trim()}</h3>
            ) : null}
            {block.text?.trim() ? <div className="prd-desc__text">{block.text}</div> : null}
          </section>
        ))}
      </div>
    );
  }

  const text = description?.trim() || shortDescription?.trim();
  if (text) {
    return <p className="prd-text">{text}</p>;
  }

  return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
}
