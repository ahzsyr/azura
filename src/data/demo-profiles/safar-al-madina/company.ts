import type { DemoCompanyInfo, DemoThemeConfig } from "@/features/setup/demo-import/types";

export const safarCompany: DemoCompanyInfo = {
  name: "Safar Al-Madina Travel Agency",
  taglineEn: "Your Trusted Partner for Memorable Travel Experiences",
  taglineAr: "شريكك الموثوق لتجارب سفر لا تُنسى",
  storyEn:
    "Safar Al-Madina Travel Agency is a professional travel and tourism company dedicated to creating exceptional travel experiences for individuals, families, groups, and corporate travelers. Combining industry expertise with personalized service, we help our clients discover the world's most inspiring destinations with confidence, comfort, and peace of mind.",
  storyAr:
    "وكالة سفر الصفار المدينة هي شركة سفر وسياحة محترفة مكرسة لخلق تجارب سفر استثنائية للأفراد والعائلات والمجموعات ومسافري الأعمال. بخبرة صناعية وخدمة شخصية، نساعد عملاءنا على اكتشاف أروع الوجهات بثقة وراحة وطمأنينة.",
  missionEn:
    "Simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.",
  missionAr:
    "تبسيط تخطيط السفر وتقديم خدمات سياحية موثوقة وعالية الجودة تساعد المسافرين على اكتشاف وجهات جديدة وخلق ذكريات لا تُنسى والسفر بثقة.",
  visionEn:
    "To become one of the region's most trusted travel and tourism companies by delivering exceptional travel experiences and outstanding customer service.",
  visionAr:
    "أن نصبح من أكثر شركات السفر والسياحة ثقة في المنطقة من خلال تقديم تجارب سفر استثنائية وخدمة عملاء متميزة.",
  valuesEn: ["Trust", "Excellence", "Customer Commitment", "Innovation", "Passion for Travel"],
  valuesAr: ["الثقة", "التميز", "الالتزام بالعميل", "الابتكار", "شغف السفر"],
  registrationNo: "SAFAR-2024-UAE",
  licenseInfo: "Licensed travel agency — UAE",
  addressEn: "Dubai, United Arab Emirates",
  addressAr: "دبي، الإمارات العربية المتحدة",
  phone: "+971 50 123 4567",
  whatsapp: "+971501234567",
  email: "info@safaralmadina.com",
  website: "www.safaralmadina.com",
  officeHoursEn: "Sun–Sat: 9:00 AM – 8:00 PM",
  officeHoursAr: "الأحد–السبت: 9:00 ص – 8:00 م",
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
  },
  trustBadges: [
    { labelEn: "Licensed Agency", labelAr: "وكالة مرخصة", icon: "fa-certificate" },
    { labelEn: "Personalized Service", labelAr: "خدمة شخصية", icon: "fa-user" },
    { labelEn: "Complete Solutions", labelAr: "حلول متكاملة", icon: "fa-suitcase" },
    { labelEn: "Trusted Partner", labelAr: "شريك موثوق", icon: "fa-handshake" },
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
    ctaLabelEn: "Plan Your Trip",
    ctaLabelAr: "خطط لرحلتك",
    ctaHref: "/contact",
  },
  footerConfig: {
    columns: 4,
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    taglineEn: "Your gateway to exceptional travel experiences and unforgettable destinations.",
    taglineAr: "بوابتك لتجارب سفر استثنائية ووجهات لا تُنسى.",
  },
};
