export type PublicSchemaAuditRoute = {
  id: string;
  label: string;
  pathname: string;
};

export const PUBLIC_SCHEMA_AUDIT_ROUTES: PublicSchemaAuditRoute[] = [
  { id: "home", label: "Homepage", pathname: "/en" },
  { id: "about", label: "About", pathname: "/en/about" },
  { id: "contact", label: "Contact", pathname: "/en/contact" },
  { id: "products", label: "Products", pathname: "/en/products" },
  { id: "product-pdp", label: "Product PDP", pathname: "/en/products" },
  { id: "categories", label: "Categories", pathname: "/en/categories" },
  { id: "services", label: "Services", pathname: "/en/services" },
];
