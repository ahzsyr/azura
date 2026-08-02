import { generateId } from "./menu-engine";
import type { MenuItem } from "./types";

export type MenuTemplateId =
  | "corporate"
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "agency"
  | "blog"
  | "portfolio";

export type MenuTemplate = {
  id: MenuTemplateId;
  label: string;
  description: string;
  build: () => MenuItem[];
};

function link(label: string, url: string): MenuItem {
  return {
    id: generateId(),
    type: "link",
    label,
    placement: "both",
    children: [],
    url,
    visibility: "visible",
    audience: "all",
  };
}

const templates: MenuTemplate[] = [
  {
    id: "corporate",
    label: "Corporate",
    description: "Company-focused structure with solutions and resources.",
    build: () => [
      link("Home", "/"),
      link("About", "/about"),
      { ...link("Solutions", "/solutions"), children: [link("Enterprise", "/solutions/enterprise"), link("SMB", "/solutions/smb")] },
      link("Resources", "/resources"),
      link("Contact", "/contact"),
    ],
  },
  {
    id: "saas",
    label: "SaaS",
    description: "Product-led funnel with features and pricing.",
    build: () => [link("Product", "/product"), link("Features", "/features"), link("Pricing", "/pricing"), link("Docs", "/docs"), link("Login", "/login")],
  },
  {
    id: "ecommerce",
    label: "E-Commerce",
    description: "Storefront categories with cart/account entry points.",
    build: () => [link("Shop", "/products"), link("Collections", "/collections"), link("Deals", "/deals"), link("Cart", "/cart"), link("Account", "/account")],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Buyer and seller navigation paths.",
    build: () => [link("Browse", "/browse"), link("Categories", "/categories"), link("Become a Seller", "/sell"), link("Pricing", "/pricing"), link("Support", "/support")],
  },
  {
    id: "agency",
    label: "Agency",
    description: "Services-first template with case studies.",
    build: () => [link("Services", "/services"), link("Work", "/case-studies"), link("Team", "/team"), link("Insights", "/insights"), link("Contact", "/contact")],
  },
  {
    id: "blog",
    label: "Blog",
    description: "Content-first layout with categories and authors.",
    build: () => [link("Latest", "/blog"), link("Categories", "/blog/categories"), link("Authors", "/blog/authors"), link("About", "/about"), link("Newsletter", "/newsletter")],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Creator portfolio with projects and booking CTA.",
    build: () => [link("Projects", "/projects"), link("Services", "/services"), link("About", "/about"), link("Testimonials", "/testimonials"), link("Book a Call", "/contact")],
  },
];

export const menuTemplateService = {
  list(): MenuTemplate[] {
    return templates;
  },
  build(id: MenuTemplateId): MenuItem[] {
    return templates.find((t) => t.id === id)?.build() ?? [];
  },
};

export const MenuTemplateService = menuTemplateService;
