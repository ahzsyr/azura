export type PublicSchemaAuditRoute = {
  id: string;
  label: string;
  pathname: string;
};

export const PUBLIC_SCHEMA_AUDIT_ROUTES: PublicSchemaAuditRoute[] = [
  { id: "home", label: "Homepage", pathname: "/" },
  { id: "about", label: "About", pathname: "/about" },
  { id: "contact", label: "Contact", pathname: "/contact" },
  { id: "products", label: "Products", pathname: "/products" },
  { id: "product-pdp", label: "Product PDP", pathname: "/products" },
  { id: "categories", label: "Categories", pathname: "/categories" },
  { id: "services", label: "Services", pathname: "/services" },
];
