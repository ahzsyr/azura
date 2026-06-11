import type { DemoPageDefinition } from "@/features/setup/demo-import/types";
import {
  hero,
  featureGrid,
  catalog,
  statsCounter,
  testimonialsBlock,
  cta,
  advancedRichText,
  benefitsGrid,
  trustBadges,
  faqBlock,
  masonryGallery,
  inquiryForm,
  richText,
} from "@/features/setup/demo-import/block-factory";

export const safarPages: DemoPageDefinition[] = [
  {
    slug: "home",
    templateKey: "home",
    titleEn: "Home",
    titleAr: "الرئيسية",
    buildBlocks: (ctx) => [
      hero({
        titleEn: "Your Trusted Partner for Memorable Travel Experiences",
        titleAr: "شريكك الموثوق لتجارب سفر لا تُنسى",
        subtitleEn: "Travel • Explore • Discover",
        subtitleAr: "سافر • استكشف • اكتشف",
        badgeEn: "Licensed Travel Agency",
        badgeAr: "وكالة سفر مرخصة",
        imageUrl: ctx.media.hero?.url,
        mediaAssetId: ctx.media.hero?.id,
        ctaLabelEn: "Plan Your Trip",
        ctaLabelAr: "خطط لرحلتك",
        ctaHref: "/contact",
        secondaryCtaLabelEn: "View Packages",
        secondaryCtaLabelAr: "عرض الباقات",
        secondaryCtaHref: "/packages",
        layout: "fullBleed",
      }),
      featureGrid({
        titleEn: "Our Services",
        titleAr: "خدماتنا",
        subtitleEn: "Complete travel solutions under one roof",
        subtitleAr: "حلول سفر متكاملة تحت سقف واحد",
        columns: 3,
        items: [
          { titleEn: "Travel Planning", titleAr: "تخطيط السفر", descriptionEn: "Personalized itineraries tailored to your preferences.", descriptionAr: "برامج مخصصة حسب تفضيلاتك.", icon: "fa-map", href: "/services" },
          { titleEn: "Tour Packages", titleAr: "باقات السفر", descriptionEn: "Curated packages for every type of traveler.", descriptionAr: "باقات منتقاة لكل نوع من المسافرين.", icon: "fa-suitcase", href: "/packages" },
          { titleEn: "Flight Booking", titleAr: "حجز الطيران", descriptionEn: "Domestic and international flight reservations.", descriptionAr: "حجوزات طيران محلية ودولية.", icon: "fa-plane", href: "/services" },
          { titleEn: "Tourism Experiences", titleAr: "تجارب سياحية", descriptionEn: "Guided tours and cultural immersion.", descriptionAr: "جولات مرشدة وانغماس ثقافي.", icon: "fa-compass", href: "/packages" },
        ],
      }),
      catalog({
        source: "packages",
        titleEn: "Featured Tour Packages",
        titleAr: "باقات السفر المميزة",
        subtitleEn: "Handpicked experiences for unforgettable journeys",
        subtitleAr: "تجارب منتقاة لرحلات لا تُنسى",
        limit: 6,
        featuredOnly: true,
        viewAllHref: "/packages",
      }),
      statsCounter({
        titleEn: "Why Travelers Choose Us",
        titleAr: "لماذا يختارنا المسافرون",
        items: [
          { value: 15, suffix: "+", labelEn: "Years of Expertise", labelAr: "سنوات الخبرة" },
          { value: 50, suffix: "+", labelEn: "Destinations", labelAr: "وجهة" },
          { value: 5000, suffix: "+", labelEn: "Happy Travelers", labelAr: "مسافر سعيد" },
        ],
      }),
      testimonialsBlock({
        titleEn: "Traveler Reviews",
        titleAr: "آراء المسافرين",
        subtitleEn: "Real stories from our valued clients",
        subtitleAr: "قصص حقيقية من عملائنا الكرام",
        collectionSlug: "safar-travelers",
      }),
      cta({
        titleEn: "Ready for Your Next Adventure?",
        titleAr: "مستعد لمغامرتك القادمة؟",
        subtitleEn: "Let our travel specialists create the perfect journey for you.",
        subtitleAr: "دع متخصصينا يصممون الرحلة المثالية لك.",
        buttonEn: "Plan Your Trip",
        buttonAr: "خطط لرحلتك",
        href: "/contact",
      }),
    ],
  },
  {
    slug: "about",
    templateKey: "about",
    titleEn: "About Us",
    titleAr: "من نحن",
    buildBlocks: () => [
      hero({
        titleEn: "About Safar Al-Madina",
        titleAr: "عن سفر المدينة",
        subtitleEn: "Creating unforgettable memories through carefully planned travel",
        subtitleAr: "خلق ذكريات لا تُنسى عبر سفر مخطط بعناية",
        ctaLabelEn: "Contact Us",
        ctaLabelAr: "اتصل بنا",
        ctaHref: "/contact",
      }),
      advancedRichText({
        htmlEn:
          "<p>At Safar Al-Madina Travel Agency, we believe that travel is more than reaching a destination—it is about creating unforgettable memories, discovering new cultures, and experiencing the world in meaningful ways.</p><h3>Our Vision</h3><p>To become one of the region's most trusted travel and tourism companies by delivering exceptional travel experiences, innovative solutions, and outstanding customer service.</p><h3>Our Mission</h3><p>To simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.</p>",
        htmlAr:
          "<p>في وكالة سفر الصفار المدينة، نؤمن أن السفر أكثر من الوصول إلى وجهة—إنه خلق ذكريات لا تُنسى واكتشاف ثقافات جديدة.</p><h3>رؤيتنا</h3><p>أن نصبح من أكثر شركات السفر ثقة في المنطقة.</p><h3>مهمتنا</h3><p>تبسيط تخطيط السفر وتقديم خدمات سياحية موثوقة وعالية الجودة.</p>",
      }),
      benefitsGrid({
        titleEn: "Core Values",
        titleAr: "قيمنا الأساسية",
        layout: "cards",
        items: [
          { titleEn: "Trust", titleAr: "الثقة", descriptionEn: "Building lasting relationships through honesty and dependable service.", descriptionAr: "بناء علاقات دائمة عبر الصدق والخدمة الموثوقة.", icon: "fa-handshake" },
          { titleEn: "Excellence", titleAr: "التميز", descriptionEn: "Maintaining the highest standards across every aspect of travel.", descriptionAr: "الحفاظ على أعلى المعايير في كل جانب من السفر.", icon: "fa-star" },
          { titleEn: "Customer Commitment", titleAr: "الالتزام بالعميل", descriptionEn: "Putting customer needs and satisfaction at the center.", descriptionAr: "وضع احتياجات العملاء ورضاهم في المركز.", icon: "fa-heart" },
          { titleEn: "Innovation", titleAr: "الابتكار", descriptionEn: "Continuously improving services for modern travelers.", descriptionAr: "تحسين الخدمات باستمرار للمسافرين العصريين.", icon: "fa-lightbulb" },
          { titleEn: "Passion for Travel", titleAr: "شغف السفر", descriptionEn: "Sharing enthusiasm for exploration and discovery.", descriptionAr: "مشاركة الحماس للاستكشاف والاكتشاف.", icon: "fa-globe" },
        ],
      }),
      richText({
        contentEn:
          "<h3>Brand Philosophy</h3><p><strong>Warm &amp; Welcoming</strong> — Every interaction makes travelers feel valued and supported.</p><p><strong>Authentic Experiences</strong> — Genuine travel that creates lasting memories.</p><p><strong>Excellence in Service</strong> — Professionalism and attention to detail guide everything we do.</p>",
        contentAr:
          "<h3>فلسفة العلامة</h3><p><strong>دافئ ومرحب</strong> — كل تفاعل يجعل المسافر يشعر بالتقدير.</p><p><strong>تجارب أصيلة</strong> — سفر حقيقي يخلق ذكريات دائمة.</p><p><strong>تميز في الخدمة</strong> — الاحترافية والاهتمام بالتفاصيل يوجهان كل ما نفعله.</p>",
      }),
    ],
  },
  {
    slug: "packages",
    templateKey: "packages",
    titleEn: "Tour Packages",
    titleAr: "باقات السفر",
    buildBlocks: () => [
      hero({
        titleEn: "Tour Packages",
        titleAr: "باقات السفر",
        subtitleEn: "Carefully curated travel packages for every type of journey",
        subtitleAr: "باقات سفر منتقاة بعناية لكل نوع من الرحلات",
        ctaLabelEn: "Custom Package",
        ctaLabelAr: "باقة مخصصة",
        ctaHref: "/contact",
      }),
      catalog({ source: "packages", titleEn: "All Packages", titleAr: "جميع الباقات", limit: 12, viewAllHref: "/packages" }),
      faqBlock({ titleEn: "Package FAQ", titleAr: "أسئلة الباقات", faqSetSlug: "packages" }),
    ],
  },
  {
    slug: "services",
    templateKey: "services",
    titleEn: "Services",
    titleAr: "الخدمات",
    buildBlocks: () => [
      hero({
        titleEn: "Our Travel Services",
        titleAr: "خدمات السفر",
        subtitleEn: "End-to-end travel management from planning to support during travel",
        subtitleAr: "إدارة سفر متكاملة من التخطيط إلى الدعم أثناء السفر",
      }),
      featureGrid({
        titleEn: "What We Offer",
        titleAr: "ما نقدمه",
        columns: 2,
        items: [
          { titleEn: "Travel Planning & Consultation", titleAr: "تخطيط واستشارة السفر", descriptionEn: "Personalized itinerary development, destination recommendations, and visa guidance.", descriptionAr: "تطوير برامج مخصصة وتوصيات وجهات وإرشاد تأشيرات.", icon: "fa-map-marked-alt", href: "/contact" },
          { titleEn: "Flight & Ticket Booking", titleAr: "حجز الطيران", descriptionEn: "International and domestic flights, multi-city planning, and group reservations.", descriptionAr: "رحلات دولية ومحلية وتخطيط متعدد المدن وحجوزات جماعية.", icon: "fa-plane-departure", href: "/contact" },
          { titleEn: "Tourism Experiences", titleAr: "تجارب سياحية", descriptionEn: "Guided tours, cultural experiences, adventure activities, and luxury tourism.", descriptionAr: "جولات مرشدة وتجارب ثقافية وأنشطة مغامرة وسياحة فاخرة.", icon: "fa-camera", href: "/packages" },
          { titleEn: "Corporate Travel", titleAr: "سفر الأعمال", descriptionEn: "Business travel bookings, group arrangements, and schedule management.", descriptionAr: "حجوزات سفر أعمال وترتيبات جماعية وإدارة الجداول.", icon: "fa-briefcase", href: "/contact" },
        ],
      }),
      catalog({ source: "services", titleEn: "Service Offerings", titleAr: "عروض الخدمات", limit: 6 }),
    ],
  },
  {
    slug: "hotels-transport",
    templateKey: "hotels-transport",
    titleEn: "Hotels & Transport",
    titleAr: "الفنادق والنقل",
    buildBlocks: () => [
      hero({
        titleEn: "Hotels & Transport",
        titleAr: "الفنادق والنقل",
        subtitleEn: "Premium accommodations and reliable transport arrangements",
        subtitleAr: "إقامة فاخرة وترتيبات نقل موثوقة",
      }),
      catalog({ source: "hotels", titleEn: "Partner Hotels", titleAr: "فنادق الشركاء", limit: 6 }),
    ],
  },
  {
    slug: "gallery",
    templateKey: "gallery",
    titleEn: "Gallery",
    titleAr: "المعرض",
    buildBlocks: () => [
      hero({
        titleEn: "Destinations Gallery",
        titleAr: "معرض الوجهات",
        subtitleEn: "Explore the world's most inspiring destinations",
        subtitleAr: "استكشف أروع الوجهات في العالم",
      }),
      masonryGallery({
        titleEn: "Our Destinations",
        titleAr: "وجهاتنا",
        subtitleEn: "From spiritual journeys to luxury escapes",
        subtitleAr: "من الرحلات الروحانية إلى العطلات الفاخرة",
        gallerySlug: "safar-destinations",
      }),
    ],
  },
  {
    slug: "testimonials",
    templateKey: "testimonials",
    titleEn: "Testimonials",
    titleAr: "آراء العملاء",
    buildBlocks: () => [
      hero({
        titleEn: "Traveler Testimonials",
        titleAr: "آراء المسافرين",
        subtitleEn: "Stories from travelers who trusted Safar Al-Madina",
        subtitleAr: "قصص من مسافرين وثقوا بسفر المدينة",
      }),
      testimonialsBlock({
        titleEn: "What Our Travelers Say",
        titleAr: "ماذا يقول مسافرونا",
        collectionSlug: "safar-travelers",
        limit: 12,
      }),
    ],
  },
  {
    slug: "why-choose-us",
    templateKey: "landing",
    titleEn: "Why Choose Us",
    titleAr: "لماذا تختارنا",
    buildBlocks: () => [
      hero({
        titleEn: "Why Choose Safar Al-Madina?",
        titleAr: "لماذا تختار سفر المدينة؟",
        subtitleEn: "We don't simply book trips—we create journeys worth remembering",
        subtitleAr: "لا نحجز رحلات فحسب—نخلق رحلات تستحق التذكر",
        ctaLabelEn: "Start Planning",
        ctaLabelAr: "ابدأ التخطيط",
        ctaHref: "/contact",
      }),
      benefitsGrid({
        titleEn: "Our Advantages",
        titleAr: "مزايانا",
        layout: "twoColumn",
        items: [
          { titleEn: "Professional Expertise", titleAr: "خبرة احترافية", descriptionEn: "Extensive knowledge of global destinations and travel logistics.", descriptionAr: "معرفة واسعة بالوجهات العالمية ولوجستيات السفر.", icon: "fa-graduation-cap" },
          { titleEn: "Personalized Service", titleAr: "خدمة شخصية", descriptionEn: "Every traveler is unique — we tailor experiences to your expectations.", descriptionAr: "كل مسافر فريد — نخصص التجارب لتوقعاتك.", icon: "fa-user-check" },
          { titleEn: "Trusted Partner", titleAr: "شريك موثوق", descriptionEn: "Transparency, reliability, and consistent service quality.", descriptionAr: "شفافية وموثوقية وجودة خدمة متسقة.", icon: "fa-shield-alt" },
          { titleEn: "Complete Solutions", titleAr: "حلول متكاملة", descriptionEn: "From planning to support during travel — all under one roof.", descriptionAr: "من التخطيط إلى الدعم أثناء السفر — كل شيء تحت سقف واحد.", icon: "fa-check-circle" },
        ],
      }),
      trustBadges({
        titleEn: "Our Commitment",
        titleAr: "التزامنا",
        items: [
          { labelEn: "Licensed Agency", labelAr: "وكالة مرخصة", icon: "fa-certificate" },
          { labelEn: "Personalized Itineraries", labelAr: "برامج مخصصة", icon: "fa-route" },
          { labelEn: "24/7 Support", labelAr: "دعم 24/7", icon: "fa-headset" },
          { labelEn: "Best Value", labelAr: "أفضل قيمة", icon: "fa-tag" },
        ],
      }),
      faqBlock({ titleEn: "Booking Questions", titleAr: "أسئلة الحجز", faqSetSlug: "booking" }),
    ],
  },
  {
    slug: "contact",
    templateKey: "contact",
    titleEn: "Contact",
    titleAr: "اتصل بنا",
    buildBlocks: () => [
      hero({
        titleEn: "Contact Us",
        titleAr: "اتصل بنا",
        subtitleEn: "Your gateway to exceptional travel experiences",
        subtitleAr: "بوابتك لتجارب سفر استثنائية",
      }),
      inquiryForm({
        titleEn: "Plan Your Journey",
        titleAr: "خطط لرحلتك",
        type: "CONTACT",
      }),
      richText({
        contentEn:
          "<p><strong>Safar Al-Madina Travel Agency</strong></p><p>Travel • Explore • Discover</p><p>📧 info@safaralmadina.com</p><p>📞 +971 50 123 4567</p><p><em>Your gateway to exceptional travel experiences, trusted service, and unforgettable destinations.</em></p>",
        contentAr:
          "<p><strong>وكالة سفر الصفار المدينة</strong></p><p>سافر • استكشف • اكتشف</p><p>📧 info@safaralmadina.com</p><p>📞 +971 50 123 4567</p><p><em>بوابتك لتجارب سفر استثنائية وخدمة موثوقة ووجهات لا تُنسى.</em></p>",
      }),
    ],
  },
];
