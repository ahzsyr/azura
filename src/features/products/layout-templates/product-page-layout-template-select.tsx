"use client";

import {
  getProductPageLayoutTemplateMeta,
  listProductPageLayoutTemplates,
  validateTemplateId,
  type ProductPageLayoutTemplateId,
} from "@/features/products/layout-templates/registry";
import { Label } from "@/components/ui/label";
import { PRODUCT_PAGE_DESIGN_HREF } from "@/features/catalog/admin/catalog-admin-tabs";

type Props = {
  value: string | null | undefined;
  /** `null` = inherit (when allowInherit). Otherwise a validated registry id. */
  onChange: (value: ProductPageLayoutTemplateId | null) => void;
  allowInherit?: boolean;
  inheritLabel?: string;
  label?: string;
  id?: string;
  /** Extra copy under the control (cascade / override explanation). */
  hint?: string;
  showScopeLinks?: boolean;
};

export function ProductPageLayoutTemplateSelect({
  value,
  onChange,
  allowInherit = true,
  inheritLabel = "Inherit (category → brand → site default)",
  label = "Product page layout",
  id = "product-page-layout-template",
  hint,
  showScopeLinks = false,
}: Props) {
  const templates = listProductPageLayoutTemplates();
  const inherited = value == null || value === "";
  const selectValue = inherited ? "__inherit__" : validateTemplateId(value);
  const selectedMeta = inherited ? null : getProductPageLayoutTemplateMeta(validateTemplateId(value));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__inherit__") onChange(null);
          else onChange(validateTemplateId(next));
        }}
      >
        {allowInherit ? <option value="__inherit__">{inheritLabel}</option> : null}
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.label}
          </option>
        ))}
      </select>
      {selectedMeta ? (
        <p className="text-xs text-muted-foreground">{selectedMeta.description}</p>
      ) : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {showScopeLinks ? (
        <p className="text-xs text-muted-foreground">
          Assign for a whole{" "}
          <a href="/admin/categories" className="underline">
            category
          </a>
          ,{" "}
          <a href="/admin/catalog-taxonomy" className="underline">
            brand
          </a>
          , or set the{" "}
          <a href={PRODUCT_PAGE_DESIGN_HREF} className="underline">
            site default
          </a>
          . Product overrides win, then category, then brand, then site.
        </p>
      ) : null}
    </div>
  );
}
