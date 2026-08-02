import type { DemoCompanyInfo, DemoThemeConfig } from "@/features/setup/demo-import/types";

export const safarCompany: DemoCompanyInfo = {
  name: "Safar Al-Madina Travel Agency",
  tagline: "Your Trusted Partner for Memorable Travel Experiences",
  story:
    "Safar Al-Madina Travel Agency is a professional travel and tourism company dedicated to creating exceptional travel experiences for individuals, families, groups, and corporate travelers. Combining industry expertise with personalized service, we help our clients discover the world's most inspiring destinations with confidence, comfort, and peace of mind.",
  mission:
    "Simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.",
  vision:
    "To become one of the region's most trusted travel and tourism companies by delivering exceptional travel experiences and outstanding customer service.",
  values: ["Trust", "Excellence", "Customer Commitment", "Innovation", "Passion for Travel"],
  registrationNo: "SAFAR-2024-UAE",
  licenseInfo: "Licensed travel agency — UAE",
  address: "Dubai, United Arab Emirates",
  phone: "+971 50 123 4567",
  whatsapp: "+971501234567",
  email: "info@safaralmadina.com",
  website: "www.safaralmadina.com",
  officeHours: "Sun–Sat: 9:00 AM – 8:00 PM",
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
  },
  trustBadges: [
    { label: "Licensed Agency", icon: "fa-certificate" },
    { label: "Personalized Service", icon: "fa-user" },
    { label: "Complete Solutions", icon: "fa-suitcase" },
    { label: "Trusted Partner", icon: "fa-handshake" },
  ],
};

export const safarTheme: DemoThemeConfig = {
  presetId: "travel",
  brandConfig: {
    name: "Safar Al-Madina",
    shortName: "SAM",
    tagline: "Travel • Explore • Discover",
    logoMode: "text",
    logoText: "SAM",
    showTagline: true,
  },
  headerConfig: {
    showLogo: true,
    showNav: true,
    showSearch: true,
    showCta: true,
    sticky: true,
    ctaLabel: "Plan Your Trip",
    ctaHref: "/contact",
  },
  footerConfig: {
    columns: 4,
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    tagline: "Your gateway to exceptional travel experiences and unforgettable destinations.",
  },
};
