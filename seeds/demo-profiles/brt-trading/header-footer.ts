import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import { createDefaultWorkspace, buildDefaultHeaderActions } from "@/features/navigation/defaults";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { menuLink } from "@/seeds/demo-profiles/shared";

export function buildBrtHeader() {
  const base = createDefaultWorkspace();
  return {
    ...base,
    branding: normalizeBranding({
      logoMode: "text",
      logoText: "BRT",
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: "BRT TRADING LLC",
      tagline: "Wireless & Smart Technology",
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
          menuLink("nav-services", "Services", "/services", "الخدمات"),
          menuLink("nav-smart-home", "Smart Home", "/smart-home", "المنزل الذكي"),
          menuLink("nav-gallery", "Gallery", "/gallery", "المعرض"),
          menuLink("nav-blog", "Blog", "/blog", "المدونة"),
          menuLink("nav-contact", "Contact", "/contact", "اتصل بنا"),
        ],
      },
    },
    headerActions: buildDefaultHeaderActions().map((a) =>
      a.id === "action-cta"
        ? { ...a, label: "Get a Quote", icon: "fa-paper-plane" }
        : a
    ),
  };
}

export function buildBrtFooter() {
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
        id: "services",
        type: "menu" as const,
        enabled: true,
        title: "Services",
        menuSource: "custom" as const,
        links: [
          { label: "Enterprise Wireless", href: "/enterprise-wireless" },
          { label: "Smart Home", href: "/smart-home" },
          { label: "Security Solutions", href: "/security-solutions" },
          { label: "IoT & Connected Tech", href: "/services" },
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
          { label: "Our Process", href: "/about#process" },
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
        title: "Connect",
        showSocial: true,
        showEmail: false,
        showPhone: false,
        showAddress: false,
      },
    ],
    copyright: {
      showBar: true,
      rightsText: "© BRT TRADING LLC. All rights reserved.",
      suffix: "Empowering Connectivity. Enhancing Security. Enabling Smart Living.",
      legalLinks: [],
    },
  };
}
