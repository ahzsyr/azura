import type { ProductDetailedSection } from "../../types";
import { ProductSectionAccordion } from "./product-section-accordion";

type Props = {
  sections: ProductDetailedSection[];
  description?: string;
  shortDescription?: string;
  emptyLabel?: string;
  collapseLabel?: string;
};

function sectionTitle(section: ProductDetailedSection, fallback: string, index: number, total: number): string {
  const heading = section.heading?.trim();
  if (heading) return heading;
  return total > 1 ? `${fallback} ${index + 1}` : fallback;
}

export function ProductDescriptionPanel({
  sections,
  description,
  shortDescription,
  emptyLabel = "No description for this product yet.",
  collapseLabel = "Description",
}: Props) {
  const populated = sections.filter((s) => (s.heading?.trim() || s.text?.trim()).length > 0);

  if (populated.length > 0) {
    return (
      <ProductSectionAccordion
        items={populated.map((section, idx) => ({
          id: `${sectionTitle(section, collapseLabel, idx, populated.length)}-${idx}`,
          title: sectionTitle(section, collapseLabel, idx, populated.length),
          content: section.text?.trim() ? (
            <div className="prd-desc__text">{section.text}</div>
          ) : null,
        }))}
      />
    );
  }

  const text = description?.trim() || shortDescription?.trim();
  if (text) {
    return (
      <ProductSectionAccordion
        items={[
          {
            id: "description",
            title: collapseLabel,
            content: <p className="prd-desc__text">{text}</p>,
          },
        ]}
      />
    );
  }

  return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
}
