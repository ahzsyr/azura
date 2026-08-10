import type { DemoCompanyInfo, DemoThemeConfig } from "@/features/setup/demo-import/types";

export const brtCompany: DemoCompanyInfo = {
  name: "BRT TRADING LLC",
  tagline: "Innovative Wireless & Smart Technology Solutions",
  story:
    "BRT TRADING LLC is a leading provider of wireless communication, networking, security, and smart automation solutions. With over a decade of industry experience, we help organizations and homeowners leverage cutting-edge technologies to improve connectivity, security, operational efficiency, and digital transformation.",
  mission:
    "Deliver reliable, scalable, and future-ready technology solutions that enhance connectivity, improve security, and create smarter living and working environments.",
  vision:
    "Empowering connectivity, enhancing security, and enabling smart living across enterprises and homes throughout the region.",
  values: ["Quality", "Innovation", "Customer Satisfaction"],
  registrationNo: "BRT-2024-UAE",
  licenseInfo: "Licensed technology solutions provider — UAE",
  address: "Dubai, United Arab Emirates",
  phone: "+971 55 472 7292",
  whatsapp: "+971554727292",
  email: "info@brt-me.com",
  website: "www.brt-me.com",
  officeHours: "Sun–Thu: 9:00 AM – 6:00 PM",
  socialLinks: {
    linkedin: "https://linkedin.com",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
  },
  trustBadges: [
    { label: "10+ Years Experience", icon: "fa-award" },
    { label: "500+ Projects Delivered", icon: "fa-briefcase" },
    { label: "99% Client Satisfaction", icon: "fa-star" },
    { label: "Certified Expertise", icon: "fa-certificate" },
  ],
};

export const brtTheme: DemoThemeConfig = {
  presetId: "brt",
  brandConfig: {
    name: "BRT TRADING LLC",
    shortName: "BRT",
    tagline: "Innovative Wireless & Smart Technology Solutions",
    logoMode: "text",
    logoText: "BRT",
    showTagline: true,
  },
  headerConfig: {
    showLogo: true,
    showNav: true,
    showSearch: true,
    showCta: true,
    sticky: true,
    ctaLabel: "Get a Quote",
    ctaHref: "/contact",
  },
  footerConfig: {
    columns: 4,
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    tagline: "Empowering Connectivity. Enhancing Security. Enabling Smart Living.",
  },
};
