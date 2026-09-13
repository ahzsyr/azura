import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import { createDefaultWorkspace, buildDefaultHeaderActions } from "@/features/navigation/defaults";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { menuLink } from "@/seeds/demo-profiles/shared";

export function buildSafarHeader() {
  const base = createDefaultWorkspace();
  return {
    ...base,
    branding: normalizeBranding({
      logoMode: "text",
      logoText: "SAM",
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: "Safar Al-Madina",
      tagline: "Travel • Explore • Discover",
      showTagline: true,
      areaStyle: "default",
      brandLayoutMobile: "logo-and-text",
      brandLayoutDesktop: "logo-and-text",
    }),
    menusDatabase: {
      mainMenu: {
        name: "Main Menu",
        globalApply: "Both" as const,
        items: [
          menuLink("nav-home", "Home", "/", "الرئيسية"),
          menuLink("nav-about", "About", "/about", "من نحن"),
          menuLink("nav-packages", "Tour Packages", "/packages", "باقات السفر"),
          menuLink("nav-services", "Services", "/services", "الخدمات"),
          menuLink("nav-hotels", "Hotels & Transport", "/hotels-transport", "الفنادق والنقل"),
          menuLink("nav-gallery", "Gallery", "/gallery", "المعرض"),
          menuLink("nav-blog", "Blog", "/blog", "المدونة"),
          menuLink("nav-contact", "Contact", "/contact", "اتصل بنا"),
        ],
      },
    },
    headerActions: buildDefaultHeaderActions().map((a) =>
      a.id === "action-cta"
        ? { ...a, label: "Plan Your Trip", icon: "fa-plane" }
        : a
    ),
  };
}

export function buildSafarFooter() {
  const base = createDefaultFooterWorkspace();
  return {
    ...base,
    gridColumns: 4 as const,
    columns: [
      {
        id: "brand",
        type: "brand" as const,
        enabled: true,
        title: "",
        showSocial: false,
        showEmail: false,
        showPhone: false,
        showAddress: false,
      },
      {
        id: "packages",
        type: "menu" as const,
        enabled: true,
        title: "Tour Packages",
        menuSource: "custom" as const,
        links: [
          { label: "Family Holidays", href: "/packages" },
          { label: "Honeymoon Packages", href: "/packages" },
          { label: "Religious Tourism", href: "/packages" },
          { label: "Adventure Travel", href: "/packages" },
        ],
        showSocial: false,
        showEmail: false,
        showPhone: false,
        showAddress: false,
      },
      {
        id: "company",
        type: "menu" as const,
        enabled: true,
        title: "Company",
        menuSource: "custom" as const,
        links: [
          { label: "About Us", href: "/about" },
          { label: "Why Choose Us", href: "/why-choose-us" },
          { label: "Testimonials", href: "/testimonials" },
          { label: "Contact", href: "/contact" },
        ],
        showSocial: false,
        showEmail: false,
        showPhone: false,
        showAddress: false,
      },
      {
        id: "contact",
        type: "contact" as const,
        enabled: true,
        title: "Contact",
        showEmail: true,
        showPhone: true,
        showAddress: true,
        showSocial: false,
      },
      {
        id: "social",
        type: "social" as const,
        enabled: true,
        title: "Follow Us",
        showSocial: true,
        showEmail: false,
        showPhone: false,
        showAddress: false,
      },
    ],
    copyright: {
      showBar: true,
      rightsText: "© Safar Al-Madina Travel Agency. All rights reserved.",
      suffix: "Travel • Explore • Discover",
      legalLinks: [],
    },
  };
}
