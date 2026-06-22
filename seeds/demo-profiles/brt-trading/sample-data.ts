import type { DemoSampleData } from "@/features/setup/demo-import/types";
import { DEMO_PLACEHOLDER, demoMedia } from "@/seeds/demo-profiles/shared";

const HERO = "/demo/brt/hero.svg";

export const brtMediaFiles = [
  demoMedia("hero", HERO, "BRT TRADING LLC technology solutions"),
  demoMedia("project-1", DEMO_PLACEHOLDER, "Enterprise wireless deployment", "نشر شبكة لاسلكية للمؤسسات"),
  demoMedia("project-2", DEMO_PLACEHOLDER, "Smart home automation", "أتمتة المنزل الذكي"),
  demoMedia("project-3", DEMO_PLACEHOLDER, "Security surveillance system", "نظام مراقبة أمنية"),
  demoMedia("project-4", DEMO_PLACEHOLDER, "IoT sensor network", "شبكة مستشعرات إنترنت الأشياء"),
  demoMedia("project-5", DEMO_PLACEHOLDER, "Indoor coverage solution", "حل تغطية داخلية"),
  demoMedia("project-6", DEMO_PLACEHOLDER, "IP PBX installation", "تركيب IP PBX"),
  demoMedia("project-7", DEMO_PLACEHOLDER, "Network infrastructure", "بنية شبكة تحتية"),
  demoMedia("project-8", DEMO_PLACEHOLDER, "Smart lock integration", "تكامل الأقفال الذكية"),
  demoMedia("project-9", DEMO_PLACEHOLDER, "CCTV analytics", "تحليلات كاميرات المراقبة"),
  demoMedia("project-10", DEMO_PLACEHOLDER, "Building automation", "أتمتة المباني"),
  demoMedia("project-11", DEMO_PLACEHOLDER, "Voice assistant setup", "إعداد المساعد الصوتي"),
  demoMedia("project-12", DEMO_PLACEHOLDER, "Energy management", "إدارة الطاقة"),
  demoMedia("service-wireless", DEMO_PLACEHOLDER, "Enterprise wireless", "شبكة لاسلكية للمؤسسات"),
  demoMedia("service-security", DEMO_PLACEHOLDER, "Security solutions", "حلول الأمن"),
  demoMedia("service-smarthome", DEMO_PLACEHOLDER, "Smart home", "المنزل الذكي"),
];

export const brtSampleData: DemoSampleData = {
  faqSets: [
    {
      slug: "general",
      title: "General FAQ",
      items: [
        {
          question: "What industries does BRT TRADING LLC serve?",
          answer:
            "We serve enterprises, commercial facilities, hospitality, residential developments, and government sectors with wireless, security, and smart technology solutions.",
        },
        {
          question: "Do you provide ongoing support after installation?",
          answer:
            "Yes. We offer continuous monitoring, technical support, upgrades, and optimization services to keep systems performing at their best.",
        },
        {
          question: "How long does a typical project take?",
          answer:
            "Project timelines vary by scope. A site survey and consultation typically lead to a detailed timeline during the design phase.",
        },
      ],
    },
    {
      slug: "smart-home",
      title: "Smart Home FAQ",
      items: [
        {
          question: "Which voice assistants are supported?",
          answer: "Our smart home solutions integrate with Amazon Alexa, Google Assistant, and Apple Siri.",
        },
        {
          question: "Can I control my home remotely?",
          answer:
            "Yes. Monitor and manage lighting, climate, security, and devices from your smartphone, tablet, or voice commands.",
        },
      ],
    },
    {
      slug: "security",
      title: "Security FAQ",
      items: [
        {
          question: "What security systems do you install?",
          answer:
            "CCTV surveillance, access control, smart locks, video analytics, motion detection, and integrated security platforms.",
        },
      ],
    },
  ],
  testimonials: [
    {
      name: "Ahmed Al-Rashid",
      location: "Dubai, UAE",
      rating: 5,
      content:
        "BRT delivered a flawless enterprise wireless network for our headquarters. Coverage is excellent and support is responsive.",
    },
    {
      name: "Sarah Mitchell",
      location: "Abu Dhabi, UAE",
      rating: 5,
      content:
        "Our smart home automation project exceeded expectations. Everything works seamlessly with voice control.",
    },
    {
      name: "Khalid Hassan",
      location: "Sharjah, UAE",
      rating: 5,
      content:
        "Professional security installation with intelligent monitoring. We feel much safer with BRT's integrated system.",
    },
    {
      name: "Jennifer Park",
      location: "Dubai, UAE",
      rating: 5,
      content:
        "Indoor coverage solutions eliminated dead zones across our commercial building. Highly recommended.",
    },
    {
      name: "Omar Farouk",
      location: "Ajman, UAE",
      rating: 5,
      content: "IoT integration helped us automate facility management and reduce operational costs significantly.",
    },
    {
      name: "Lisa Chen",
      location: "Dubai, UAE",
      rating: 5,
      content:
        "End-to-end project delivery from consultation to training. BRT's team is knowledgeable and reliable.",
    },
  ],
  testimonialCollections: [
    {
      slug: "brt-clients",
      title: "Client Testimonials",
      testimonialIndexes: [0, 1, 2, 3, 4, 5],
    },
  ],
  galleries: [
    {
      slug: "brt-projects",
      title: "Project Gallery",
      media: [
        { title: "Enterprise Wireless Deployment", mediaKey: "project-1" },
        { title: "Smart Home Automation", mediaKey: "project-2" },
        { title: "Security Surveillance", mediaKey: "project-3" },
        { title: "IoT Sensor Network", mediaKey: "project-4" },
        { title: "Indoor Coverage", mediaKey: "project-5" },
        { title: "IP PBX System", mediaKey: "project-6" },
        { title: "Network Infrastructure", mediaKey: "project-7" },
        { title: "Smart Lock Integration", mediaKey: "project-8" },
        { title: "CCTV Analytics", mediaKey: "project-9" },
        { title: "Building Automation", mediaKey: "project-10" },
        { title: "Voice Assistant Setup", mediaKey: "project-11" },
        { title: "Energy Management", mediaKey: "project-12" },
      ],
    },
  ],
  contentItems: [
    {
      slug: "enterprise-wireless",
      contentTypeSlug: "offerings",
      title: "Enterprise Wireless Networks",
      excerpt: "Robust wireless infrastructures for seamless connectivity.",
      description:
        "Design and deployment of wireless networks including site surveys, optimization, and 24/7 monitoring.",
      attributes: { offeringType: "OTHER", icon: "fa-wifi", ctaLabel: "Learn More", ctaHref: "/enterprise-wireless" },
      imageKey: "service-wireless",
      isFeatured: true,
    },
    {
      slug: "indoor-coverage",
      contentTypeSlug: "offerings",
      title: "Enterprise Indoor Coverage",
      excerpt: "Building-wide signal enhancement and multi-operator coverage.",
      description: "GSM stability, wireless data, handset connectivity, and IP PBX communication stability.",
      attributes: { offeringType: "OTHER", icon: "fa-signal", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-5",
      isFeatured: true,
    },
    {
      slug: "security-systems",
      contentTypeSlug: "offerings",
      title: "Security Solutions",
      excerpt: "CCTV, access control, smart locks, and integrated platforms.",
      description: "Comprehensive security systems with intelligent monitoring and proactive protection.",
      attributes: { offeringType: "OTHER", icon: "fa-shield", ctaLabel: "Learn More", ctaHref: "/security-solutions" },
      imageKey: "service-security",
      isFeatured: true,
    },
    {
      slug: "iot-solutions",
      contentTypeSlug: "offerings",
      title: "IoT & Smart Technology",
      excerpt: "Device integration, automation, and real-time analytics.",
      description: "Connect devices, automate processes, and gain insights through intelligent control systems.",
      attributes: { offeringType: "OTHER", icon: "fa-microchip", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-4",
    },
    {
      slug: "smart-home-automation",
      contentTypeSlug: "offerings",
      title: "Smart Home Automation",
      excerpt: "Lighting, climate, security, and entertainment automation.",
      description: "Create connected living environments with mobile app and voice assistant control.",
      attributes: { offeringType: "OTHER", icon: "fa-home", ctaLabel: "Learn More", ctaHref: "/smart-home" },
      imageKey: "service-smarthome",
      isFeatured: true,
    },
    {
      slug: "ip-pbx",
      contentTypeSlug: "offerings",
      title: "IP PBX & Unified Communications",
      excerpt: "Enterprise-grade voice and unified communication platforms.",
      description: "Reliable IP PBX deployment with building-wide communication stability.",
      attributes: { offeringType: "OTHER", icon: "fa-phone", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-6",
    },
    {
      slug: "infrastructure",
      contentTypeSlug: "offerings",
      title: "Infrastructure Solutions",
      excerpt: "Scalable network infrastructure design and deployment.",
      description: "End-to-end infrastructure solutions for enterprises and commercial facilities.",
      attributes: { offeringType: "OTHER", icon: "fa-server", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-7",
    },
  ],
  formTemplates: [
    {
      slug: "brt-contact",
      name: "BRT Contact Form",
      category: "CONTACT",
      definition: {
        fields: [
          { id: "name", type: "text", label: "Full Name", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "phone", type: "phone", label: "Phone", required: false },
          {
            id: "service",
            type: "select",
            label: "Service Interest",
            required: false,
            options: [
              { value: "wireless", label: "Enterprise Wireless"},
              { value: "security", label: "Security"},
              { value: "smarthome", label: "Smart Home"},
              { value: "iot", label: "IoT"},
            ],
          },
          { id: "message", type: "textarea", label: "Message", required: true },
        ],
      },
    },
  ],
  postCategories: [
    { slug: "technology", name: "Technology"},
    { slug: "smart-home", name: "Smart Home"},
  ],
  posts: [
    {
      slug: "iot-trends-2026",
      title: "IoT Trends Shaping Smart Buildings in 2026",
      excerpt: "How connected devices are transforming facility management and energy efficiency.",
      content:
        "<p>The Internet of Things continues to revolutionize how buildings operate. From predictive maintenance to real-time energy monitoring, IoT solutions deliver measurable ROI for enterprises.</p><p>BRT TRADING LLC helps organizations integrate devices, automate processes, and gain valuable insights through intelligent control systems.</p>",
      imageKey: "project-4",
      categorySlug: "technology",
    },
    {
      slug: "smart-home-security-guide",
      title: "Smart Home Security: A Complete Guide",
      excerpt: "Protect your property with integrated smart locks, cameras, and automated responses.",
      content:
        "<p>Smart security goes beyond traditional alarms. With intelligent surveillance, motion detection, and automated response systems, homeowners gain peace of mind and instant alerts.</p>",
      imageKey: "project-3",
      categorySlug: "smart-home",
    },
    {
      slug: "enterprise-wifi-best-practices",
      title: "Enterprise Wi-Fi Best Practices",
      excerpt: "Design principles for reliable, high-performance wireless networks.",
      content:
        "<p>Enterprise wireless networks require careful planning. Site surveys, coverage analysis, and ongoing optimization ensure maximum stability and performance across your facility.</p>",
      imageKey: "service-wireless",
      categorySlug: "technology",
    },
    {
      slug: "energy-efficiency-smart-tech",
      title: "Energy Efficiency Through Smart Technology",
      excerpt: "Reduce energy costs by up to 30% with intelligent scheduling and automation.",
      content:
        "<p>Smart technologies help reduce energy consumption while improving comfort. Automated monitoring, intelligent scheduling, and 24/7 energy analytics deliver sustainable building management.</p>",
      imageKey: "project-12",
      categorySlug: "smart-home",
    },
  ],
};
