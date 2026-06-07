import type { PageBlocks } from "@/types/builder";
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
  makeBlock,
  resetBlockCounter,
} from "@/features/setup/demo-import/block-factory";

function buildTemplate(blocks: PageBlocks): PageBlocks {
  resetBlockCounter();
  return blocks;
}

export const BUILTIN_PAGE_TEMPLATE_BLOCKS: Record<string, PageBlocks> = {
  landing: buildTemplate([
    hero({
      titleEn: "Welcome to our website",
      titleAr: "مرحباً بكم في موقعنا",
      subtitleEn: "Discover our services and solutions",
      subtitleAr: "اكتشف خدماتنا وحلولنا",
      badgeEn: "Trusted partner",
      badgeAr: "شريك موثوق",
      ctaLabelEn: "Get started",
      ctaLabelAr: "ابدأ الآن",
      ctaHref: "/contact",
      secondaryCtaLabelEn: "View packages",
      secondaryCtaLabelAr: "عرض الباقات",
      secondaryCtaHref: "/packages",
      layout: "fullBleed",
    }),
    featureGrid({
      titleEn: "Our services",
      titleAr: "خدماتنا",
      subtitleEn: "Everything you need in one place",
      subtitleAr: "كل ما تحتاجه في مكان واحد",
      columns: 3,
      items: [
        {
          titleEn: "Planning",
          titleAr: "التخطيط",
          descriptionEn: "Personalized guidance for your goals.",
          descriptionAr: "إرشاد مخصص لتحقيق أهدافك.",
          icon: "fa-map",
          href: "/services",
        },
        {
          titleEn: "Packages",
          titleAr: "الباقات",
          descriptionEn: "Curated options for every need.",
          descriptionAr: "خيارات منتقاة لكل احتياج.",
          icon: "fa-suitcase",
          href: "/packages",
        },
        {
          titleEn: "Support",
          titleAr: "الدعم",
          descriptionEn: "Responsive help when you need it.",
          descriptionAr: "مساعدة سريعة عند الحاجة.",
          icon: "fa-headset",
          href: "/contact",
        },
      ],
    }),
    catalog({
      source: "packages",
      titleEn: "Featured packages",
      titleAr: "باقات مميزة",
      subtitleEn: "Handpicked highlights",
      subtitleAr: "أبرز الخيارات",
      limit: 6,
      featuredOnly: true,
      viewAllHref: "/packages",
    }),
    statsCounter({
      titleEn: "Why choose us",
      titleAr: "لماذا تختارنا",
      items: [
        { value: 10, suffix: "+", labelEn: "Years of experience", labelAr: "سنوات الخبرة" },
        { value: 100, suffix: "+", labelEn: "Happy clients", labelAr: "عميل سعيد" },
        { value: 24, suffix: "/7", labelEn: "Support", labelAr: "دعم" },
      ],
    }),
    testimonialsBlock({
      titleEn: "What clients say",
      titleAr: "آراء العملاء",
      subtitleEn: "Real feedback from our community",
      subtitleAr: "تعليقات حقيقية من مجتمعنا",
      collectionSlug: "default",
    }),
    cta({
      titleEn: "Ready to get started?",
      titleAr: "مستعد للبدء؟",
      subtitleEn: "Contact us today and we will help you take the next step.",
      subtitleAr: "تواصل معنا اليوم وسنساعدك في الخطوة التالية.",
      buttonEn: "Contact us",
      buttonAr: "اتصل بنا",
      href: "/contact",
    }),
  ]),

  about: buildTemplate([
    hero({
      titleEn: "About us",
      titleAr: "من نحن",
      subtitleEn: "Learn more about our story and mission",
      subtitleAr: "تعرّف على قصتنا ومهمتنا",
      ctaLabelEn: "Contact us",
      ctaLabelAr: "اتصل بنا",
      ctaHref: "/contact",
    }),
    advancedRichText({
      htmlEn:
        "<p>We are dedicated to delivering exceptional experiences for every client.</p><h3>Our vision</h3><p>To be a trusted partner known for quality, integrity, and innovation.</p><h3>Our mission</h3><p>To provide reliable services that help our customers succeed.</p>",
      htmlAr:
        "<p>نلتزم بتقديم تجارب استثنائية لكل عميل.</p><h3>رؤيتنا</h3><p>أن نكون شريكاً موثوقاً معروفاً بالجودة والنزاهة والابتكار.</p><h3>مهمتنا</h3><p>تقديم خدمات موثوقة تساعد عملاءنا على النجاح.</p>",
    }),
    benefitsGrid({
      titleEn: "Our values",
      titleAr: "قيمنا",
      layout: "cards",
      items: [
        {
          titleEn: "Trust",
          titleAr: "الثقة",
          descriptionEn: "Honesty and transparency in every interaction.",
          descriptionAr: "الصدق والشفافية في كل تفاعل.",
          icon: "fa-handshake",
        },
        {
          titleEn: "Quality",
          titleAr: "الجودة",
          descriptionEn: "High standards across everything we deliver.",
          descriptionAr: "معايير عالية في كل ما نقدمه.",
          icon: "fa-star",
        },
        {
          titleEn: "Service",
          titleAr: "الخدمة",
          descriptionEn: "Putting customer needs at the center.",
          descriptionAr: "وضع احتياجات العملاء في المركز.",
          icon: "fa-heart",
        },
      ],
    }),
    richText({
      contentEn: "<p><em>We look forward to serving you.</em></p>",
      contentAr: "<p><em>نتطلع إلى خدمتكم.</em></p>",
    }),
  ]),

  contact: buildTemplate([
    hero({
      titleEn: "Contact us",
      titleAr: "اتصل بنا",
      subtitleEn: "We are here to help",
      subtitleAr: "نحن هنا لمساعدتك",
    }),
    inquiryForm({
      titleEn: "Send a message",
      titleAr: "أرسل رسالة",
      type: "CONTACT",
    }),
    richText({
      contentEn: "<p>Reach out by phone, email, or the form above.</p>",
      contentAr: "<p>تواصل معنا عبر الهاتف أو البريد أو النموذج أعلاه.</p>",
    }),
  ]),

  faq: buildTemplate([
    hero({
      titleEn: "Frequently asked questions",
      titleAr: "الأسئلة الشائعة",
      subtitleEn: "Quick answers to common questions",
      subtitleAr: "إجابات سريعة على الأسئلة الشائعة",
    }),
    faqBlock({
      titleEn: "FAQ",
      titleAr: "الأسئلة الشائعة",
      faqSetSlug: "general",
    }),
  ]),

  gallery: buildTemplate([
    hero({
      titleEn: "Gallery",
      titleAr: "المعرض",
      subtitleEn: "Browse our visual collection",
      subtitleAr: "تصفح مجموعتنا المرئية",
    }),
    masonryGallery({
      titleEn: "Photo gallery",
      titleAr: "معرض الصور",
      subtitleEn: "Highlights from our work",
      subtitleAr: "أبرز أعمالنا",
      gallerySlug: "default",
    }),
  ]),

  testimonials: buildTemplate([
    hero({
      titleEn: "Testimonials",
      titleAr: "آراء العملاء",
      subtitleEn: "Stories from people we have helped",
      subtitleAr: "قصص من أشخاص ساعدناهم",
    }),
    testimonialsBlock({
      titleEn: "Client reviews",
      titleAr: "مراجعات العملاء",
      collectionSlug: "default",
      limit: 12,
    }),
  ]),

  packages: buildTemplate([
    hero({
      titleEn: "Packages",
      titleAr: "الباقات",
      subtitleEn: "Explore our offerings",
      subtitleAr: "استكشف عروضنا",
      ctaLabelEn: "Custom package",
      ctaLabelAr: "باقة مخصصة",
      ctaHref: "/contact",
    }),
    catalog({
      source: "packages",
      titleEn: "All packages",
      titleAr: "جميع الباقات",
      limit: 12,
      viewAllHref: "/packages",
    }),
    faqBlock({
      titleEn: "Package FAQ",
      titleAr: "أسئلة الباقات",
      faqSetSlug: "packages",
    }),
  ]),

  hotels: buildTemplate([
    hero({
      titleEn: "Hotels & transport",
      titleAr: "الفنادق والنقل",
      subtitleEn: "Accommodation and travel arrangements",
      subtitleAr: "ترتيبات الإقامة والسفر",
    }),
    catalog({
      source: "hotels",
      titleEn: "Partner hotels",
      titleAr: "فنادق الشركاء",
      limit: 6,
    }),
    catalog({
      source: "services",
      titleEn: "Transport options",
      titleAr: "خيارات النقل",
      limit: 6,
    }),
  ]),

  products: buildTemplate([
    hero({
      titleEn: "Products",
      titleAr: "المنتجات",
      subtitleEn: "Browse our catalog",
      subtitleAr: "تصفح كتالوجنا",
    }),
    makeBlock("productGrid", {
      titleEn: "All products",
      titleAr: "جميع المنتجات",
      subtitleEn: "",
      subtitleAr: "",
      source: "collection",
      collectionSlug: "",
      limit: 12,
      columns: 3,
      showPrice: true,
      showCompare: true,
      viewAllHref: "/products",
    }),
  ]),

  collections: buildTemplate([
    hero({
      titleEn: "Collections",
      titleAr: "المجموعات",
      subtitleEn: "Curated product collections",
      subtitleAr: "مجموعات منتجات منتقاة",
    }),
    makeBlock("categoryExplorer", {
      titleEn: "Browse collections",
      titleAr: "تصفح المجموعات",
      subtitleEn: "",
      subtitleAr: "",
      layout: "grid",
      columns: 3,
      showProductCount: true,
    }),
  ]),

  services: buildTemplate([
    hero({
      titleEn: "Services",
      titleAr: "الخدمات",
      subtitleEn: "What we offer",
      subtitleAr: "ما نقدمه",
    }),
    featureGrid({
      titleEn: "Our offerings",
      titleAr: "عروضنا",
      columns: 2,
      items: [
        {
          titleEn: "Consultation",
          titleAr: "استشارة",
          descriptionEn: "Expert advice tailored to your needs.",
          descriptionAr: "نصائح خبراء مخصصة لاحتياجاتك.",
          icon: "fa-comments",
          href: "/contact",
        },
        {
          titleEn: "Implementation",
          titleAr: "التنفيذ",
          descriptionEn: "End-to-end delivery with care.",
          descriptionAr: "تنفيذ متكامل بعناية.",
          icon: "fa-cogs",
          href: "/contact",
        },
      ],
    }),
    catalog({
      source: "services",
      titleEn: "Service catalog",
      titleAr: "كتالوج الخدمات",
      limit: 6,
    }),
  ]),

  compare: buildTemplate([
    hero({
      titleEn: "Compare",
      titleAr: "المقارنة",
      subtitleEn: "Side-by-side comparison",
      subtitleAr: "مقارنة جنباً إلى جنب",
    }),
    makeBlock("productComparison", {
      titleEn: "Compare items",
      titleAr: "قارن العناصر",
      productSlugs: [],
      layout: "table",
      highlightDifferences: true,
    }),
  ]),

  favorites: buildTemplate([
    hero({
      titleEn: "Favorites",
      titleAr: "المفضلة",
      subtitleEn: "Your saved items",
      subtitleAr: "عناصرك المحفوظة",
    }),
    makeBlock("recentlyViewed", {
      titleEn: "Saved for later",
      titleAr: "محفوظ لاحقاً",
      subtitleEn: "",
      subtitleAr: "",
      limit: 8,
      emptyMessageEn: "No favorites yet.",
      emptyMessageAr: "لا توجد مفضلات بعد.",
    }),
  ]),

  account: buildTemplate([
    hero({
      titleEn: "My account",
      titleAr: "حسابي",
      subtitleEn: "Manage your profile and orders",
      subtitleAr: "إدارة ملفك وطلباتك",
    }),
    richText({
      contentEn: "<p>Sign in to view your account dashboard.</p>",
      contentAr: "<p>سجّل الدخول لعرض لوحة حسابك.</p>",
    }),
  ]),
};
