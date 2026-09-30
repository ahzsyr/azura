import "server-only";

import { loadCatalogUiMessages } from "@/i18n/catalog-ui-messages";

function pick(dict: Record<string, string> | undefined, key: string, fallback: string): string {
  const value = dict?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export type PdpLabels = {
  home: string;
  products: string;
  collections: string;
  brand: string;
  sku: string;
  mpn: string;
  ean: string;
  reviews: string;
  description: string;
  specifications: string;
  documents: string;
  shipping: string;
  noDescription: string;
  noSpecs: string;
  noDocuments: string;
  noShipping: string;
  document: string;
  frequentlyBought: string;
  productFallback: string;
  exploreCollections: string;
  crossMainCategories: string;
  crossEquipment: string;
  crossDevices: string;
  servicesDelivery: string;
  servicesDeliveryDesc: string;
  servicesPayment: string;
  servicesPaymentDesc: string;
  servicesWarranty: string;
  servicesWarrantyDesc: string;
  certHeading: string;
  inStock: string;
  preOrder: string;
  outOfStock: string;
  buyNow: string;
  quantity: string;
  compare: string;
  compareAdded: string;
  compareRemoved: string;
  compareFull: string;
  saveList: string;
  saveAdded: string;
  saveRemoved: string;
  condition: string;
  conditionNew: string;
  conditionUsed: string;
  conditionRefurbished: string;
  deliveryHeading: string;
  keySpecs: string;
  warranty: string;
  category: string;
  stockTooltip: string;
};

export async function loadPdpLabels(localePrefix: string): Promise<PdpLabels> {
  const { product, nav } = loadCatalogUiMessages(localePrefix);
  const t = (key: string, fallback: string) => pick(product, key, fallback);

  return {
    home: pick(nav, "home", "Home"),
    products: t("breadcrumb", "Products"),
    collections: pick(
      loadCatalogUiMessages(localePrefix).collection,
      "breadcrumb",
      "Collections",
    ),
    brand: t("brand", "Brand"),
    sku: t("sku", "SKU"),
    mpn: t("mpn", "MPN"),
    ean: t("ean", "EAN"),
    reviews: t("reviews", "reviews"),
    description: t("description", "Description"),
    specifications: t("specifications", "Specifications"),
    documents: t("documents", "Documents"),
    shipping: t("shipping", "Shipping"),
    noDescription: t("noDescription", "No description for this product yet."),
    noSpecs: t("noSpecs", "No specifications available for this product."),
    noDocuments: t("noDocuments", "No documents available."),
    noShipping: t("noShipping", "Shipping information is not available for this product."),
    document: t("document", "Document"),
    frequentlyBought: t("frequentlyBought", "Frequently bought together"),
    productFallback: t("breadcrumb", "Product"),
    exploreCollections: t("exploreCollections", "Explore collections"),
    crossMainCategories: t("crossMainCategories", "Main categories"),
    crossEquipment: t("crossEquipment", "Equipment types"),
    crossDevices: t("crossDevices", "Devices & accessories"),
    servicesDelivery: t("servicesDelivery", "Delivery"),
    servicesDeliveryDesc: t(
      "servicesDeliveryDesc",
      "Worldwide shipping with tracked carriers. Standard and express options at checkout.",
    ),
    servicesPayment: t("servicesPayment", "Payment"),
    servicesPaymentDesc: t(
      "servicesPaymentDesc",
      "Secure payments via card, bank transfer, and Apple Pay where available.",
    ),
    servicesWarranty: t("servicesWarranty", "Warranty & Returns"),
    servicesWarrantyDesc: t(
      "servicesWarrantyDesc",
      "Manufacturer warranty on new items. 14-day returns on unused equipment.",
    ),
    certHeading: t("certHeading", "Certified partner"),
    inStock: t("inStock", "In stock"),
    preOrder: t("preOrder", "Pre-order"),
    outOfStock: t("outOfStock", "Out of stock"),
    buyNow: t("buyNow", t("addToCart", "Buy Now")),
    quantity: t("quantity", "Quantity"),
    compare: t("compare", "Compare"),
    compareAdded: t("compareAdded", "Added to compare list"),
    compareRemoved: t("compareRemoved", "Removed from compare list"),
    compareFull: t("compareFull", "Comparison list is full (3 products max)"),
    saveList: t("saveList", "Save to list"),
    saveAdded: t("saveAdded", "Saved to your list"),
    saveRemoved: t("saveRemoved", "Removed from your list"),
    condition: t("condition", "Condition"),
    conditionNew: t("conditionNew", "New"),
    conditionUsed: t("conditionUsed", "Used"),
    conditionRefurbished: t("conditionRefurbished", "Refurbished"),
    deliveryHeading: t("deliveryHeading", "Delivery"),
    keySpecs: t("keySpecs", "Key specifications"),
    warranty: t("warranty", "Warranty"),
    category: t("category", "Category"),
    stockTooltip: t(
      "stockTooltip",
      "Stock levels are updated regularly. Contact us for large orders or regional availability.",
    ),
  };
}
