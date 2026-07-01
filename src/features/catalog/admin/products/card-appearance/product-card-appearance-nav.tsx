"use client";

import type { ProductCardAppearanceSectionId } from "@/features/products/card-appearance/product-card-appearance.types";
import { PRODUCT_CARD_APPEARANCE_SECTIONS } from "@/features/products/card-appearance/product-card-appearance.types";

export function ProductCardAppearanceNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: ProductCardAppearanceSectionId;
  onSectionChange: (id: ProductCardAppearanceSectionId) => void;
}) {
  return (
    <nav className="pca-nav" aria-label="Product card sections">
      <ul className="pca-nav__list">
        {PRODUCT_CARD_APPEARANCE_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`pca-nav__item${activeSection === section.id ? " is-active" : ""}`}
              onClick={() => onSectionChange(section.id)}
            >
              <span className="pca-nav__label">{section.label}</span>
              {section.description ? (
                <span className="pca-nav__desc">{section.description}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
