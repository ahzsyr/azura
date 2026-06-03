import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_TAGLINE,
  getSeedAdminEmail,
  getSeedAdminPassword,
  getSeedCompanyEmail,
} from "../src/config/site";
import { seedContentPlatform } from "./seed-content";
import { buildDefaultPageBlocks, isEmptyBlocks } from "../src/features/cms/seed-page-blocks";

const prisma = new PrismaClient();

const IMG = {
  kaaba: "/uploads/images/1780187853120-placeholder.png",
  madinah: "/uploads/images/1780187853120-placeholder.png",
  hotel: "/uploads/images/1780187853120-placeholder.png",
  travel: "/uploads/images/1780187853120-placeholder.png",
  mosque: "/uploads/images/1780187853120-placeholder.png",
};

async function main() {
  const brand = DEFAULT_BRAND_NAME;
  const adminEmail = getSeedAdminEmail();
  const adminPassword = getSeedAdminPassword();
  const companyEmail = getSeedCompanyEmail();

  console.log(`Seeding AZURA database (demo brand: ${brand})...`);

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  await prisma.companyInfo.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: brand,
      taglineEn: `Your trusted companion for sacred journeys.`,
      taglineAr: "رفيقك الموثوق في الرحلات المقدسة.",
      storyEn: `${brand} was founded with a singular purpose: to serve pilgrims with devotion, care, and excellence. We guide Muslims on Umrah journeys, combining spiritual sensitivity with premium travel logistics.`,
      storyAr: `تأسست ${brand} بهدف واحد: خدمة الحجاج بالإخلاص والرعاية والتميز. نرشد المسلمين في رحلات العمرة مع الجمع بين الحساسية الروحانية والخدمات السياحية الفاخرة.`,
      missionEn: "To make every pilgrim's journey seamless, spiritual, and memorable through premium Islamic travel services.",
      missionAr: "جعل رحلة كل حاج سلسة وروحانية ولا تُنسى من خلال خدمات السفر الإسلامي الفاخرة.",
      visionEn: "To be the most trusted name in Umrah and Islamic travel across the region.",
      visionAr: "أن نكون الاسم الأكثر ثقة في العمرة والسفر الإسلامي في المنطقة.",
      valuesEn: ["Trust & Integrity", "Pilgrim-First Care", "Excellence in Service", "Spiritual Sensitivity"],
      valuesAr: ["الثقة والنزاهة", "رعاية الحاج أولاً", "التميز في الخدمة", "الحساسية الروحانية"],
      registrationNo: "CR-1234567890",
      licenseInfo: "Licensed Umrah Operator — Ministry of Hajj & Umrah Approved",
      addressEn: "King Abdul Aziz Road, Jeddah, Saudi Arabia",
      addressAr: "طريق الملك عبد العزيز، جدة، المملكة العربية السعودية",
      phone: "+966 12 345 6789",
      whatsapp: "966500000000",
      email: companyEmail,
      officeHoursEn: "Sun–Thu: 9:00 AM – 6:00 PM",
      officeHoursAr: "الأحد–الخميس: 9:00 ص – 6:00 م",
      socialLinks: { instagram: "#", facebook: "#", twitter: "#" },
      trustBadges: ["Ministry Licensed", "Registered Company", "IATA Partner", "5-Star Service"],
    },
  });

  await seedContentPlatform(prisma, IMG);

  await prisma.galleryMedia.deleteMany();
  await prisma.gallery.deleteMany();

  await prisma.gallery.create({
    data: {
      slug: "pilgrim-experiences",
      titleEn: "Pilgrim Experiences",
      titleAr: "تجارب الحجاج",
      excerptEn: "Moments from sacred travels with our pilgrims.",
      excerptAr: "لحظات من الرحلات المقدسة مع حجاجنا.",
      coverUrl: IMG.kaaba,
      isPublished: true,
      sortOrder: 0,
      media: {
        create: [
          { titleEn: "Group at Kaaba", titleAr: "مجموعة عند الكعبة", mediaUrl: IMG.kaaba, mediaKind: "IMAGE", sortOrder: 0, isPublished: true },
          { titleEn: "Madinah Sunset", titleAr: "غروب المدينة", mediaUrl: IMG.madinah, mediaKind: "IMAGE", sortOrder: 1, isPublished: true },
          { titleEn: "Pilgrim Prayer", titleAr: "صلاة الحاج", mediaUrl: IMG.mosque, mediaKind: "IMAGE", sortOrder: 2, isPublished: true },
        ],
      },
    },
  });

  await prisma.gallery.create({
    data: {
      slug: "travel-documentation",
      titleEn: "Travel Documentation",
      titleAr: "توثيق السفر",
      excerptEn: "Documentation from our organized journeys.",
      excerptAr: "توثيق من رحلاتنا المنظمة.",
      coverUrl: IMG.travel,
      isPublished: true,
      sortOrder: 1,
      media: {
        create: [
          { titleEn: "Travel Documentation", titleAr: "توثيق السفر", mediaUrl: IMG.travel, mediaKind: "IMAGE", sortOrder: 0, isPublished: true },
        ],
      },
    },
  });

  const testimonials = [
    {
      name: "Ahmed Hassan",
      location: "London, UK",
      rating: 5,
      contentEn: `${brand} made our family's first Umrah absolutely seamless. Every detail was handled with care and professionalism.`,
      contentAr: `جعلت ${brand} عمرة عائلتنا الأولى سلسة تماماً. كل التفاصيل تم التعامل معها بعناية واحترافية.`,
      sortOrder: 1,
    },
    {
      name: "Fatima Al-Rashid",
      location: "Dubai, UAE",
      rating: 5,
      contentEn: "The VIP package exceeded our expectations. Hotels were exceptional and the guides were knowledgeable and kind.",
      contentAr: "تجاوزت باقة VIP توقعاتنا. الفنادق كانت استثنائية والمرشدون كانوا على دراية ولطفاء.",
      sortOrder: 2,
    },
    {
      name: "Omar Ibrahim",
      location: "Toronto, Canada",
      rating: 5,
      contentEn: `From visa to return flight, everything was perfect. I highly recommend ${brand} for anyone planning Umrah.`,
      contentAr: `من التأشيرة إلى رحلة العودة، كل شيء كان مثالياً. أوصي بشدة بـ ${brand} لكل من يخطط للعمرة.`,
      sortOrder: 3,
    },
  ];

  await prisma.testimonialCollectionItem.deleteMany();
  await prisma.testimonialCollection.deleteMany();
  await prisma.testimonial.deleteMany();
  const createdTestimonials = await Promise.all(
    testimonials.map((t, index) =>
      prisma.testimonial.create({
        data: { ...t, isPublished: true, sortOrder: index },
      })
    )
  );

  await prisma.testimonialCollection.create({
    data: {
      slug: "home",
      titleEn: "Homepage Testimonials",
      titleAr: "آراء الصفحة الرئيسية",
      excerptEn: "Featured customer reviews for the homepage and marketing blocks.",
      excerptAr: "آراء العملاء المميزة للصفحة الرئيسية وكتل التسويق.",
      sortOrder: 0,
      isPublished: true,
      items: {
        create: createdTestimonials.map((t, index) => ({
          testimonialId: t.id,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.faqItem.deleteMany();
  await prisma.faqSet.deleteMany();

  await prisma.faqSet.create({
    data: {
      slug: "visa",
      titleEn: "Visa FAQs",
      titleAr: "أسئلة التأشيرة",
      excerptEn: "Common questions about visa processing and requirements.",
      excerptAr: "أسئلة شائعة حول معالجة التأشيرة والمتطلبات.",
      sortOrder: 0,
      isPublished: true,
      items: {
        create: [
          {
            questionEn: "How long does visa processing take?",
            questionAr: "كم تستغرق معالجة التأشيرة؟",
            answerEn: "Standard processing takes 5-7 business days. Express options are available.",
            answerAr: "تستغرق المعالجة القياسية 5-7 أيام عمل. خيارات سريعة متاحة.",
            sortOrder: 0,
            isPublished: true,
          },
          {
            questionEn: "What documents do I need?",
            questionAr: "ما المستندات التي أحتاجها؟",
            answerEn: "Valid passport, photos, application form, and vaccination proof if required.",
            answerAr: "جواز سفر ساري، صور، نموذج طلب، وإثبات تطعيم إذا لزم.",
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
    },
  });

  await prisma.faqSet.create({
    data: {
      slug: "general",
      titleEn: "General FAQs",
      titleAr: "أسئلة عامة",
      sortOrder: 1,
      isPublished: true,
      items: {
        create: [
          {
            questionEn: "Do you offer group packages?",
            questionAr: "هل تقدمون باقات جماعية؟",
            answerEn: "Yes, we offer customized group packages for families and organizations.",
            answerAr: "نعم، نقدم باقات جماعية مخصصة للعائلات والمؤسسات.",
            sortOrder: 0,
            isPublished: true,
          },
        ],
      },
    },
  });

  await prisma.seoSettings.upsert({
    where: { pageKey: "home" },
    update: {},
    create: {
      pageKey: "home",
      titleEn: "Premium Umrah & Islamic Travel",
      titleAr: "عمرة فاخرة وسفر إسلامي",
      descriptionEn: `${brand} — trusted companion for Umrah packages, visa services, and premium Islamic travel.`,
      descriptionAr: `${brand} — رفيق موثوق لباقات العمرة وخدمات التأشيرة والسفر الإسلامي الفاخر.`,
    },
  });

  const themeDefaults = {
    preset: "CLASSIC" as const,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    typography: { bodyFont: "Plus Jakarta Sans", headingFont: "Amiri", baseFontSize: "16px", headingScale: 1.25 },
    brandConfig: {
      brandName: brand,
      tagline: DEFAULT_TAGLINE,
      logoMode: "text",
      logoText: "AZ",
      showTagline: true,
    },
    headerConfig: {
      showLogo: true,
      showNav: true,
      showSearch: true,
      showCta: true,
      sticky: true,
      ctaLabelEn: "",
      ctaLabelAr: "",
      ctaHref: "/contact",
    },
    footerConfig: {
      columns: 3,
      showSocial: true,
      showQuickLinks: true,
      showContact: true,
      taglineEn: "",
      taglineAr: "",
    },
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: true,
    spacingScale: 1,
    customCss: null,
  };

  for (const id of ["published", "draft"]) {
    await prisma.siteTheme.upsert({
      where: { id },
      update: themeDefaults,
      create: { id, ...themeDefaults },
    });
  }

  const cmsPageSeeds = [
    { slug: "home", titleEn: "Home", titleAr: "الرئيسية", templateKey: "home" },
    { slug: "about", titleEn: "About Us", titleAr: "من نحن", templateKey: "about" },
    { slug: "contact", titleEn: "Contact", titleAr: "اتصل بنا", templateKey: "contact" },
    { slug: "packages", titleEn: "Packages", titleAr: "الباقات", templateKey: "packages" },
    { slug: "visa", titleEn: "Visa Services", titleAr: "خدمات التأشيرة", templateKey: "visa" },
    { slug: "gallery", titleEn: "Gallery", titleAr: "المعرض", templateKey: "gallery" },
    { slug: "testimonials", titleEn: "Testimonials", titleAr: "آراء العملاء", templateKey: "testimonials" },
    { slug: "hotels-transport", titleEn: "Hotels & Transport", titleAr: "الفنادق والنقل", templateKey: "hotels-transport" },
  ];

  for (const p of cmsPageSeeds) {
    const defaultBlocks = buildDefaultPageBlocks(p.slug, p.templateKey) as Prisma.InputJsonValue;
    const existing = await prisma.cmsPage.findUnique({ where: { slug: p.slug } });
    await prisma.cmsPage.upsert({
      where: { slug: p.slug },
      update: {
        ...(existing && isEmptyBlocks(existing.blocks) ? { blocks: defaultBlocks } : {}),
      },
      create: {
        ...p,
        status: "DRAFT",
        blocks: defaultBlocks,
        excerptEn: "",
        excerptAr: "",
      },
    });
  }

  await prisma.postAuthor.upsert({
    where: { id: "default-author" },
    update: {},
    create: {
      id: "default-author",
      name: `${brand} Team`,
      bioEn: "Islamic travel experts",
      bioAr: "خبراء السفر الإسلامي",
    },
  });

  await prisma.postCategory.upsert({
    where: { slug: "travel-tips" },
    update: {},
    create: { slug: "travel-tips", nameEn: "Travel Tips", nameAr: "نصائح السفر", sortOrder: 1 },
  });

  for (const locale of ["en", "ar"]) {
    await prisma.custom404.upsert({
      where: { locale },
      update: {},
      create: {
        locale,
        titleEn: "Page not found",
        titleAr: "الصفحة غير موجودة",
        bodyEn: "The page you are looking for does not exist.",
        bodyAr: "الصفحة التي تبحث عنها غير موجودة.",
        blocks: [],
      },
    });
  }

  const localeSeeds = [
    {
      code: "en",
      urlPrefix: "en",
      label: "English",
      htmlLang: "en",
      dir: "ltr",
      flag: "🇺🇸",
      dateLocale: "en-US",
      currency: "USD",
      numberLocale: "en-US",
      isEnabled: true,
      isDefault: true,
      sortOrder: 0,
    },
    {
      code: "ar",
      urlPrefix: "ar",
      label: "العربية",
      htmlLang: "ar",
      dir: "rtl",
      flag: "🇸🇦",
      dateLocale: "ar-AE",
      currency: "SAR",
      numberLocale: "ar-AE",
      isEnabled: true,
      isDefault: false,
      sortOrder: 1,
    },
  ];

  for (const loc of localeSeeds) {
    await prisma.localeConfig.upsert({
      where: { code: loc.code },
      update: loc,
      create: loc,
    });
  }

  try {
    const { searchIndexer } = await import("../src/features/search/search-indexer.service");
    await searchIndexer.rebuildAll();
    console.log("Search index rebuilt.");
  } catch (e) {
    console.warn("Search index rebuild skipped (run from app context):", e);
  }

  console.log("Seed completed successfully!");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
