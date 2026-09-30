"use client";

import { ProductPageLayoutTemplateSelect } from "@/features/products/layout-templates/product-page-layout-template-select";
import {
  formatLayoutAssignmentLabel,
  validateTemplateId,
  type ProductPageLayoutTemplateId,
} from "@/features/products/layout-templates/registry";

export function ProductPageLayoutPanel({
  siteProductPageLayoutTemplate,
  onSiteProductPageLayoutTemplateChange,
}: {
  siteProductPageLayoutTemplate?: string | null;
  onSiteProductPageLayoutTemplateChange: (value: ProductPageLayoutTemplateId | null) => void;
}) {
  return (
    <div className="ppb-layout">
      <header className="ppb-layout__header">
        <h3 className="ppb-layout__title">Page layout</h3>
        <p className="ppb-layout__desc">
          Choose the default product page layout template for the site. Applies when no product,
          category, or brand assignment overrides the layout.
        </p>
      </header>
      <div className="ppb-layout__form">
        <ProductPageLayoutTemplateSelect
          value={siteProductPageLayoutTemplate}
          onChange={onSiteProductPageLayoutTemplateChange}
          allowInherit={false}
          label="Site default product page layout"
        />
        <p className="ppb-layout__resolved">
          Resolved:{" "}
          {formatLayoutAssignmentLabel(
            validateTemplateId(siteProductPageLayoutTemplate),
            siteProductPageLayoutTemplate ? "site" : "default",
          )}
        </p>
        <p className="ppb-layout__hint">
          Assign per product in catalog product settings, per category in Categories, or per brand
          in Brands. Default layout settings in Components and Structure configure the classic PDP
          only.
        </p>
      </div>
    </div>
  );
}
