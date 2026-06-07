import type { DemoCompanyInfo, DemoThemeConfig } from "@/features/setup/demo-import/types";

export const brtCompany: DemoCompanyInfo = {
  name: "BRT TRADING LLC",
  taglineEn: "Innovative Wireless & Smart Technology Solutions",
  taglineAr: "حلول لاسلكية وتقنية ذكية مبتكرة",
  storyEn:
    "BRT TRADING LLC is a leading provider of wireless communication, networking, security, and smart automation solutions. With over a decade of industry experience, we help organizations and homeowners leverage cutting-edge technologies to improve connectivity, security, operational efficiency, and digital transformation.",
  storyAr:
    "شركة BRT TRADING LLC هي مزود رائد لحلول الاتصالات اللاسلكية والشبكات والأمن والأتمتة الذكية. بخبرة تزيد عن عقد في المجال، نساعد المؤسسات وأصحاب المنازل على الاستفادة من أحدث التقنيات لتحسين الاتصال والأمن والكفاءة التشغيلية.",
  missionEn:
    "Deliver reliable, scalable, and future-ready technology solutions that enhance connectivity, improve security, and create smarter living and working environments.",
  missionAr:
    "تقديم حلول تقنية موثوقة وقابلة للتوسع وجاهزة للمستقبل تعزز الاتصال وتحسن الأمن وتخلق بيئات معيشة وعمل أكثر ذكاءً.",
  visionEn:
    "Empowering connectivity, enhancing security, and enabling smart living across enterprises and homes throughout the region.",
  visionAr:
    "تمكين الاتصال وتعزيز الأمن وتمكين المعيشة الذكية عبر المؤسسات والمنازل في المنطقة.",
  valuesEn: ["Quality", "Innovation", "Customer Satisfaction"],
  valuesAr: ["الجودة", "الابتكار", "رضا العملاء"],
  registrationNo: "BRT-2024-UAE",
  licenseInfo: "Licensed technology solutions provider — UAE",
  addressEn: "Dubai, United Arab Emirates",
  addressAr: "دبي، الإمارات العربية المتحدة",
  phone: "+971 55 472 7292",
  whatsapp: "+971554727292",
  email: "info@brt-me.com",
  website: "www.brt-me.com",
  officeHoursEn: "Sun–Thu: 9:00 AM – 6:00 PM",
  officeHoursAr: "الأحد–الخميس: 9:00 ص – 6:00 م",
  socialLinks: {
    linkedin: "https://linkedin.com",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
  },
  trustBadges: [
    { labelEn: "10+ Years Experience", labelAr: "أكثر من 10 سنوات خبرة", icon: "fa-award" },
    { labelEn: "500+ Projects Delivered", labelAr: "أكثر من 500 مشروع", icon: "fa-briefcase" },
    { labelEn: "99% Client Satisfaction", labelAr: "99% رضا العملاء", icon: "fa-star" },
    { labelEn: "Certified Expertise", labelAr: "خبرة معتمدة", icon: "fa-certificate" },
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
    ctaLabelEn: "Get a Quote",
    ctaLabelAr: "احصل على عرض",
    ctaHref: "/contact",
  },
  footerConfig: {
    columns: 4,
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    taglineEn: "Empowering Connectivity. Enhancing Security. Enabling Smart Living.",
    taglineAr: "تمكين الاتصال. تعزيز الأمن. تمكين المعيشة الذكية.",
  },
};
