import type { DemoSampleData } from "@/features/setup/demo-import/types";
import { DEMO_PLACEHOLDER, demoMedia } from "@/data/demo-profiles/shared";

const HERO = "/demo/brt/hero.svg";

export const brtMediaFiles = [
  demoMedia("hero", HERO, "BRT TRADING LLC technology solutions", "حلول BRT TRADING LLC التقنية", "hero.svg"),
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
      titleEn: "General FAQ",
      titleAr: "الأسئلة الشائعة",
      items: [
        {
          questionEn: "What industries does BRT TRADING LLC serve?",
          questionAr: "ما القطاعات التي تخدمها BRT TRADING LLC؟",
          answerEn:
            "We serve enterprises, commercial facilities, hospitality, residential developments, and government sectors with wireless, security, and smart technology solutions.",
          answerAr:
            "نخدم المؤسسات والمرافق التجارية والضيافة والتطويرات السكنية والقطاع الحكومي بحلول لاسلكية وأمنية وتقنية ذكية.",
        },
        {
          questionEn: "Do you provide ongoing support after installation?",
          questionAr: "هل تقدمون دعماً مستمراً بعد التركيب؟",
          answerEn:
            "Yes. We offer continuous monitoring, technical support, upgrades, and optimization services to keep systems performing at their best.",
          answerAr: "نعم. نقدم مراقبة مستمرة ودعماً فنياً وترقيات وخدمات تحسين لضمان أداء الأنظمة بأفضل حال.",
        },
        {
          questionEn: "How long does a typical project take?",
          questionAr: "كم تستغرق المشاريع عادةً؟",
          answerEn:
            "Project timelines vary by scope. A site survey and consultation typically lead to a detailed timeline during the design phase.",
          answerAr: "تختلف الجداول الزمنية حسب نطاق المشروع. عادةً يتم تحديد جدول مفصل خلال مرحلة التصميم بعد المعاينة.",
        },
      ],
    },
    {
      slug: "smart-home",
      titleEn: "Smart Home FAQ",
      titleAr: "أسئلة المنزل الذكي",
      items: [
        {
          questionEn: "Which voice assistants are supported?",
          questionAr: "ما المساعدات الصوتية المدعومة؟",
          answerEn: "Our smart home solutions integrate with Amazon Alexa, Google Assistant, and Apple Siri.",
          answerAr: "تتكامل حلول المنزل الذكي مع Amazon Alexa وGoogle Assistant وApple Siri.",
        },
        {
          questionEn: "Can I control my home remotely?",
          questionAr: "هل يمكنني التحكم في منزلي عن بُعد؟",
          answerEn:
            "Yes. Monitor and manage lighting, climate, security, and devices from your smartphone, tablet, or voice commands.",
          answerAr: "نعم. راقب وأدر الإضاءة والمناخ والأمن والأجهزة من هاتفك أو جهازك اللوحي أو الأوامر الصوتية.",
        },
      ],
    },
    {
      slug: "security",
      titleEn: "Security FAQ",
      titleAr: "أسئلة الأمن",
      items: [
        {
          questionEn: "What security systems do you install?",
          questionAr: "ما أنظمة الأمن التي تركبونها؟",
          answerEn:
            "CCTV surveillance, access control, smart locks, video analytics, motion detection, and integrated security platforms.",
          answerAr: "أنظمة CCTV والتحكم في الوصول والأقفال الذكية وتحليلات الفيديو وكشف الحركة ومنصات أمن متكاملة.",
        },
      ],
    },
  ],
  testimonials: [
    {
      name: "Ahmed Al-Rashid",
      location: "Dubai, UAE",
      rating: 5,
      contentEn:
        "BRT delivered a flawless enterprise wireless network for our headquarters. Coverage is excellent and support is responsive.",
      contentAr: "قدمت BRT شبكة لاسلكية ممتازة لمقرنا. التغطية رائعة والدعم سريع الاستجابة.",
    },
    {
      name: "Sarah Mitchell",
      location: "Abu Dhabi, UAE",
      rating: 5,
      contentEn:
        "Our smart home automation project exceeded expectations. Everything works seamlessly with voice control.",
      contentAr: "مشروع أتمتة منزلنا الذكي فاق التوقعات. كل شيء يعمل بسلاسة مع التحكم الصوتي.",
    },
    {
      name: "Khalid Hassan",
      location: "Sharjah, UAE",
      rating: 5,
      contentEn:
        "Professional security installation with intelligent monitoring. We feel much safer with BRT's integrated system.",
      contentAr: "تركيب أمني احترافي مع مراقبة ذكية. نشعر بأمان أكبر مع النظام المتكامل من BRT.",
    },
    {
      name: "Jennifer Park",
      location: "Dubai, UAE",
      rating: 5,
      contentEn:
        "Indoor coverage solutions eliminated dead zones across our commercial building. Highly recommended.",
      contentAr: "حلول التغطية الداخلية أزالت المناطق الميتة في مبنانا التجاري. نوصي بها بشدة.",
    },
    {
      name: "Omar Farouk",
      location: "Ajman, UAE",
      rating: 5,
      contentEn: "IoT integration helped us automate facility management and reduce operational costs significantly.",
      contentAr: "تكامل إنترنت الأشياء ساعدنا على أتمتة إدارة المرافق وتقليل التكاليف التشغيلية بشكل كبير.",
    },
    {
      name: "Lisa Chen",
      location: "Dubai, UAE",
      rating: 5,
      contentEn:
        "End-to-end project delivery from consultation to training. BRT's team is knowledgeable and reliable.",
      contentAr: "تسليم مشروع متكامل من الاستشارة إلى التدريب. فريق BRT على دراية وموثوق.",
    },
  ],
  testimonialCollections: [
    {
      slug: "brt-clients",
      titleEn: "Client Testimonials",
      titleAr: "آراء العملاء",
      testimonialIndexes: [0, 1, 2, 3, 4, 5],
    },
  ],
  galleries: [
    {
      slug: "brt-projects",
      titleEn: "Project Gallery",
      titleAr: "معرض المشاريع",
      media: [
        { titleEn: "Enterprise Wireless Deployment", titleAr: "نشر شبكة لاسلكية", mediaKey: "project-1" },
        { titleEn: "Smart Home Automation", titleAr: "أتمتة المنزل الذكي", mediaKey: "project-2" },
        { titleEn: "Security Surveillance", titleAr: "مراقبة أمنية", mediaKey: "project-3" },
        { titleEn: "IoT Sensor Network", titleAr: "شبكة مستشعرات", mediaKey: "project-4" },
        { titleEn: "Indoor Coverage", titleAr: "تغطية داخلية", mediaKey: "project-5" },
        { titleEn: "IP PBX System", titleAr: "نظام IP PBX", mediaKey: "project-6" },
        { titleEn: "Network Infrastructure", titleAr: "بنية شبكة", mediaKey: "project-7" },
        { titleEn: "Smart Lock Integration", titleAr: "أقفال ذكية", mediaKey: "project-8" },
        { titleEn: "CCTV Analytics", titleAr: "تحليلات CCTV", mediaKey: "project-9" },
        { titleEn: "Building Automation", titleAr: "أتمتة المباني", mediaKey: "project-10" },
        { titleEn: "Voice Assistant Setup", titleAr: "مساعد صوتي", mediaKey: "project-11" },
        { titleEn: "Energy Management", titleAr: "إدارة الطاقة", mediaKey: "project-12" },
      ],
    },
  ],
  contentItems: [
    {
      slug: "enterprise-wireless",
      contentTypeSlug: "offerings",
      titleEn: "Enterprise Wireless Networks",
      titleAr: "شبكات لاسلكية للمؤسسات",
      excerptEn: "Robust wireless infrastructures for seamless connectivity.",
      excerptAr: "بنى لاسلكية قوية لاتصال سلس.",
      descriptionEn:
        "Design and deployment of wireless networks including site surveys, optimization, and 24/7 monitoring.",
      descriptionAr: "تصميم ونشر شبكات لاسلكية تشمل المعاينات والتحسين والمراقبة على مدار الساعة.",
      attributes: { offeringType: "OTHER", icon: "fa-wifi", ctaLabel: "Learn More", ctaHref: "/enterprise-wireless" },
      imageKey: "service-wireless",
      isFeatured: true,
    },
    {
      slug: "indoor-coverage",
      contentTypeSlug: "offerings",
      titleEn: "Enterprise Indoor Coverage",
      titleAr: "تغطية داخلية للمؤسسات",
      excerptEn: "Building-wide signal enhancement and multi-operator coverage.",
      excerptAr: "تعزيز الإشارة على مستوى المبنى وتغطية متعددة المشغلين.",
      descriptionEn: "GSM stability, wireless data, handset connectivity, and IP PBX communication stability.",
      descriptionAr: "استقرار GSM والبيانات اللاسلكية واتصال الهواتف واستقرار IP PBX.",
      attributes: { offeringType: "OTHER", icon: "fa-signal", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-5",
      isFeatured: true,
    },
    {
      slug: "security-systems",
      contentTypeSlug: "offerings",
      titleEn: "Security Solutions",
      titleAr: "حلول الأمن",
      excerptEn: "CCTV, access control, smart locks, and integrated platforms.",
      excerptAr: "CCTV والتحكم في الوصول والأقفال الذكية ومنصات متكاملة.",
      descriptionEn: "Comprehensive security systems with intelligent monitoring and proactive protection.",
      descriptionAr: "أنظمة أمن شاملة مع مراقبة ذكية وحماية استباقية.",
      attributes: { offeringType: "OTHER", icon: "fa-shield", ctaLabel: "Learn More", ctaHref: "/security-solutions" },
      imageKey: "service-security",
      isFeatured: true,
    },
    {
      slug: "iot-solutions",
      contentTypeSlug: "offerings",
      titleEn: "IoT & Smart Technology",
      titleAr: "إنترنت الأشياء والتقنية الذكية",
      excerptEn: "Device integration, automation, and real-time analytics.",
      excerptAr: "تكامل الأجهزة والأتمتة والتحليلات الفورية.",
      descriptionEn: "Connect devices, automate processes, and gain insights through intelligent control systems.",
      descriptionAr: "ربط الأجهزة وأتمتة العمليات والحصول على رؤى عبر أنظمة تحكم ذكية.",
      attributes: { offeringType: "OTHER", icon: "fa-microchip", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-4",
    },
    {
      slug: "smart-home-automation",
      contentTypeSlug: "offerings",
      titleEn: "Smart Home Automation",
      titleAr: "أتمتة المنزل الذكي",
      excerptEn: "Lighting, climate, security, and entertainment automation.",
      excerptAr: "أتمتة الإضاءة والمناخ والأمن والترفيه.",
      descriptionEn: "Create connected living environments with mobile app and voice assistant control.",
      descriptionAr: "بيئات معيشة متصلة مع تحكم عبر التطبيق والمساعد الصوتي.",
      attributes: { offeringType: "OTHER", icon: "fa-home", ctaLabel: "Learn More", ctaHref: "/smart-home" },
      imageKey: "service-smarthome",
      isFeatured: true,
    },
    {
      slug: "ip-pbx",
      contentTypeSlug: "offerings",
      titleEn: "IP PBX & Unified Communications",
      titleAr: "IP PBX والاتصالات الموحدة",
      excerptEn: "Enterprise-grade voice and unified communication platforms.",
      excerptAr: "منصات صوتية واتصالات موحدة للمؤسسات.",
      descriptionEn: "Reliable IP PBX deployment with building-wide communication stability.",
      descriptionAr: "نشر IP PBX موثوق مع استقرار اتصالات على مستوى المبنى.",
      attributes: { offeringType: "OTHER", icon: "fa-phone", ctaLabel: "Learn More", ctaHref: "/services" },
      imageKey: "project-6",
    },
    {
      slug: "infrastructure",
      contentTypeSlug: "offerings",
      titleEn: "Infrastructure Solutions",
      titleAr: "حلول البنية التحتية",
      excerptEn: "Scalable network infrastructure design and deployment.",
      excerptAr: "تصميم ونشر بنية شبكة قابلة للتوسع.",
      descriptionEn: "End-to-end infrastructure solutions for enterprises and commercial facilities.",
      descriptionAr: "حلول بنية تحتية متكاملة للمؤسسات والمرافق التجارية.",
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
          { id: "name", type: "text", labelEn: "Full Name", labelAr: "الاسم الكامل", required: true },
          { id: "email", type: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true },
          { id: "phone", type: "phone", labelEn: "Phone", labelAr: "الهاتف", required: false },
          {
            id: "service",
            type: "select",
            labelEn: "Service Interest",
            labelAr: "الخدمة المطلوبة",
            required: false,
            options: [
              { value: "wireless", labelEn: "Enterprise Wireless", labelAr: "شبكة لاسلكية" },
              { value: "security", labelEn: "Security", labelAr: "الأمن" },
              { value: "smarthome", labelEn: "Smart Home", labelAr: "المنزل الذكي" },
              { value: "iot", labelEn: "IoT", labelAr: "إنترنت الأشياء" },
            ],
          },
          { id: "message", type: "textarea", labelEn: "Message", labelAr: "الرسالة", required: true },
        ],
      },
    },
  ],
  postCategories: [
    { slug: "technology", nameEn: "Technology", nameAr: "التقنية" },
    { slug: "smart-home", nameEn: "Smart Home", nameAr: "المنزل الذكي" },
  ],
  posts: [
    {
      slug: "iot-trends-2026",
      titleEn: "IoT Trends Shaping Smart Buildings in 2026",
      titleAr: "اتجاهات إنترنت الأشياء في المباني الذكية 2026",
      excerptEn: "How connected devices are transforming facility management and energy efficiency.",
      excerptAr: "كيف تحول الأجهزة المتصلة إدارة المرافق وكفاءة الطاقة.",
      contentEn:
        "<p>The Internet of Things continues to revolutionize how buildings operate. From predictive maintenance to real-time energy monitoring, IoT solutions deliver measurable ROI for enterprises.</p><p>BRT TRADING LLC helps organizations integrate devices, automate processes, and gain valuable insights through intelligent control systems.</p>",
      contentAr:
        "<p>يستمر إنترنت الأشياء في إحداث ثورة في تشغيل المباني. من الصيانة التنبؤية إلى مراقبة الطاقة الفورية، تقدم حلول IoT عائداً استثمارياً ملموساً للمؤسسات.</p>",
      imageKey: "project-4",
      categorySlug: "technology",
    },
    {
      slug: "smart-home-security-guide",
      titleEn: "Smart Home Security: A Complete Guide",
      titleAr: "أمن المنزل الذكي: دليل شامل",
      excerptEn: "Protect your property with integrated smart locks, cameras, and automated responses.",
      excerptAr: "احمِ ممتلكاتك بأقفال ذكية وكاميرات واستجابات آلية متكاملة.",
      contentEn:
        "<p>Smart security goes beyond traditional alarms. With intelligent surveillance, motion detection, and automated response systems, homeowners gain peace of mind and instant alerts.</p>",
      contentAr: "<p>الأمن الذكي يتجاوز الإنذارات التقليدية. مع المراقبة الذكية وكشف الحركة والاستجابات الآلية، يحصل أصحاب المنازل على راحة البال.</p>",
      imageKey: "project-3",
      categorySlug: "smart-home",
    },
    {
      slug: "enterprise-wifi-best-practices",
      titleEn: "Enterprise Wi-Fi Best Practices",
      titleAr: "أفضل ممارسات Wi-Fi للمؤسسات",
      excerptEn: "Design principles for reliable, high-performance wireless networks.",
      excerptAr: "مبادئ تصميم شبكات لاسلكية موثوقة وعالية الأداء.",
      contentEn:
        "<p>Enterprise wireless networks require careful planning. Site surveys, coverage analysis, and ongoing optimization ensure maximum stability and performance across your facility.</p>",
      contentAr: "<p>تتطلب الشبكات اللاسلكية للمؤسسات تخطيطاً دقيقاً. المعاينات وتحليل التغطية والتحسين المستمر يضمن أقصى استقرار وأداء.</p>",
      imageKey: "service-wireless",
      categorySlug: "technology",
    },
    {
      slug: "energy-efficiency-smart-tech",
      titleEn: "Energy Efficiency Through Smart Technology",
      titleAr: "كفاءة الطاقة عبر التقنية الذكية",
      excerptEn: "Reduce energy costs by up to 30% with intelligent scheduling and automation.",
      excerptAr: "قلل تكاليف الطاقة بنسبة تصل إلى 30% عبر الجدولة الذكية والأتمتة.",
      contentEn:
        "<p>Smart technologies help reduce energy consumption while improving comfort. Automated monitoring, intelligent scheduling, and 24/7 energy analytics deliver sustainable building management.</p>",
      contentAr: "<p>تساعد التقنيات الذكية على تقليل استهلاك الطاقة مع تحسين الراحة. المراقبة الآلية والجدولة الذكية تحقق إدارة مباني مستدامة.</p>",
      imageKey: "project-12",
      categorySlug: "smart-home",
    },
  ],
};
