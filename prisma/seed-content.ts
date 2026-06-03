import type { PrismaClient } from "@prisma/client";
import { BUILTIN_CONTENT_TYPES } from "../src/features/content/content-type.registry";
import type { ContentFieldDefinition, ContentTypeDefinition } from "../src/features/content/types";

const COMPARE_FIELD_KEYS: Record<string, string[]> = {
  "catalog-items": ["duration", "price", "currency", "hotelInfo", "airlineInfo"],
  listings: ["city", "stars", "distance", "amenities"],
  offerings: ["offeringType", "highlights", "ctaLabel"],
};

function withCompareFields(fields: ContentFieldDefinition[], slug: string): ContentFieldDefinition[] {
  const keys = COMPARE_FIELD_KEYS[slug] ?? [];
  return fields.map((field, index) => {
    if (!keys.includes(field.key)) return field;
    return {
      ...field,
      compare: true,
      compareOrder: keys.indexOf(field.key) * 10,
      compareGroup: field.group
        ? field.group.charAt(0).toUpperCase() + field.group.slice(1)
        : "General",
      highlightDifferences: true,
    };
  });
}

function buildContentTypeAdminConfig(def: ContentTypeDefinition) {
  const comparable = Boolean(COMPARE_FIELD_KEYS[def.slug]?.length);
  return {
    inquiryEnabled: def.slug === "catalog-items",
    isComparable: comparable,
    comparisonSettings: {
      enabled: comparable,
      maxItems: 4,
      comparisonMode: "hybrid" as const,
    },
  };
}

const SHARED_PACKAGE_FIELDS = {
  currency: "USD",
  travelDates: ["2026-06-15", "2026-07-01", "2026-08-10"],
  facilitiesEn: ["Visa Processing", "Return Flights", "Hotel Accommodation", "Ground Transport", "Ziyarat Tours"],
  facilitiesAr: ["معالجة التأشيرة", "رحلات ذهاب وعودة", "إقامة فندقية", "نقل بري", "جولات زيارة"],
  featuresEn: ["Experienced guides", "24/7 support hotline", "Group coordination", "Spiritual briefing"],
  featuresAr: ["مرشدون ذوو خبرة", "خط دعم 24/7", "تنسيق جماعي", "إرشاد روحاني"],
  itineraryEn: [
    { day: 1, title: "Arrival in Jeddah", desc: "Airport reception and transfer to Makkah hotel." },
    { day: 2, title: "Umrah Rituals", desc: "Perform Umrah with guided assistance." },
    { day: 3, title: "Makkah Ziyarat", desc: "Visit historical Islamic sites in Makkah." },
    { day: 4, title: "Travel to Madinah", desc: "Comfortable transfer to Madinah." },
    { day: 5, title: "Madinah Ziyarat", desc: "Visit Masjid Nabawi and key sites." },
  ],
  itineraryAr: [
    { day: 1, title: "الوصول إلى جدة", desc: "استقبال في المطار والانتقال إلى فندق مكة." },
    { day: 2, title: "مناسك العمرة", desc: "أداء العمرة بمساعدة مرشد." },
    { day: 3, title: "زيارات مكة", desc: "زيارة المواقع الإسلامية التاريخية في مكة." },
    { day: 4, title: "السفر إلى المدينة", desc: "انتقال مريح إلى المدينة المنورة." },
    { day: 5, title: "زيارات المدينة", desc: "زيارة المسجد النبوي والمواقع الرئيسية." },
  ],
  hotelInfoEn: "Premium hotels within walking distance of Masjid al-Haram and Masjid Nabawi.",
  hotelInfoAr: "فنادق فاخرة على مسافة walking من المسجد الحرام والمسجد النبوي.",
  airlineInfoEn: "Return flights with reputable international carriers. Business class available on VIP/VVIP packages.",
  airlineInfoAr: "رحلات ذهاب وعودة مع شركات طيران دولية مرموقة. درجة رجال الأعمال متاحة في باقات VIP/VVIP.",
};

export async function seedContentPlatform(
  prisma: PrismaClient,
  images: { kaaba: string; madinah: string; hotel: string; mosque: string }
) {
  for (const def of BUILTIN_CONTENT_TYPES) {
    await prisma.contentType.upsert({
      where: { slug: def.slug },
      update: {
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: withCompareFields(def.fields, def.slug),
        displaySchema: def.displayDefaults ?? {},
        adminConfig: buildContentTypeAdminConfig(def),
      },
      create: {
        slug: def.slug,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: withCompareFields(def.fields, def.slug),
        displaySchema: def.displayDefaults ?? {},
        adminConfig: buildContentTypeAdminConfig(def),
        sortOrder: BUILTIN_CONTENT_TYPES.indexOf(def),
      },
    });
  }

  const catalogType = await prisma.contentType.findUnique({ where: { slug: "catalog-items" } });
  const listingsType = await prisma.contentType.findUnique({ where: { slug: "listings" } });
  const offeringsType = await prisma.contentType.findUnique({ where: { slug: "offerings" } });
  if (!catalogType || !listingsType || !offeringsType) return;

  const categories = [
    { slug: "standard", nameEn: "Standard", nameAr: "قياسي", sortOrder: 1 },
    { slug: "regular", nameEn: "Regular", nameAr: "عادي", sortOrder: 2 },
    { slug: "vip", nameEn: "VIP", nameAr: "VIP", sortOrder: 3 },
    { slug: "vvip", nameEn: "VVIP", nameAr: "VVIP", sortOrder: 4 },
  ];

  for (const cat of categories) {
    await prisma.contentCollection.upsert({
      where: { slug: cat.slug },
      update: { ...cat, contentTypeId: catalogType.id },
      create: { ...cat, contentTypeId: catalogType.id },
    });
  }

  const collections = await prisma.contentCollection.findMany({
    where: { contentTypeId: catalogType.id },
  });
  const catMap = Object.fromEntries(collections.map((c) => [c.slug, c.id]));

  const packages = [
    {
      slug: "standard-umrah-7-days",
      collectionId: catMap.standard,
      titleEn: "Standard Umrah — 7 Days",
      titleAr: "عمرة قياسية — 7 أيام",
      descriptionEn: "Essential Umrah package with comfortable accommodations and guided support for first-time pilgrims.",
      descriptionAr: "باقة عمرة أساسية مع إقامة مريحة ودعم مرشد للحجاج لأول مرة.",
      duration: 7,
      price: "1299",
      isFeatured: false,
      sortOrder: 1,
    },
    {
      slug: "regular-umrah-10-days",
      collectionId: catMap.regular,
      titleEn: "Regular Umrah — 10 Days",
      titleAr: "عمرة عادية — 10 أيام",
      descriptionEn: "Balanced package with 4-star hotels, full transport, and experienced guides in Makkah and Madinah.",
      descriptionAr: "باقة متوازنة مع فنادق 4 نجوم ونقل كامل ومرشدين ذوي خبرة في مكة والمدينة.",
      duration: 10,
      price: "1899",
      isFeatured: true,
      sortOrder: 2,
    },
    {
      slug: "vip-umrah-12-days",
      collectionId: catMap.vip,
      titleEn: "VIP Umrah — 12 Days",
      titleAr: "عمرة VIP — 12 يوماً",
      descriptionEn: "Premium experience with 5-star hotels near Haram, private transport, and dedicated concierge.",
      descriptionAr: "تجربة فاخرة مع فنادق 5 نجوم قرب الحرم ونقل خاص وكونسierge مخصص.",
      duration: 12,
      price: "3499",
      isFeatured: true,
      sortOrder: 3,
    },
    {
      slug: "vvip-royal-umrah-14-days",
      collectionId: catMap.vvip,
      titleEn: "VVIP Royal Umrah — 14 Days",
      titleAr: "عمرة ملكية VVIP — 14 يوماً",
      descriptionEn: "The ultimate luxury Umrah with royal suites, private aviation options, and white-glove service throughout.",
      descriptionAr: "أقصى فخامة العمرة مع أجنحة ملكية وخيارات طيران خاص وخدمة white-glove طوال الرحلة.",
      duration: 14,
      price: "7999",
      isFeatured: true,
      sortOrder: 4,
    },
  ];

  for (const pkg of packages) {
    const { duration, price, collectionId, ...rest } = pkg;
    const item = await prisma.contentItem.upsert({
      where: { contentTypeId_slug: { contentTypeId: catalogType.id, slug: pkg.slug } },
      update: {
        ...rest,
        collectionId,
        attributes: { duration, price, ...SHARED_PACKAGE_FIELDS },
        status: "PUBLISHED",
        isVisible: true,
      },
      create: {
        contentTypeId: catalogType.id,
        ...rest,
        collectionId,
        attributes: { duration, price, ...SHARED_PACKAGE_FIELDS },
        status: "PUBLISHED",
        isVisible: true,
      },
    });

    const mediaCount = await prisma.contentItemMedia.count({ where: { itemId: item.id } });
    if (mediaCount === 0) {
      await prisma.contentItemMedia.createMany({
        data: [
          { itemId: item.id, url: images.kaaba, altEn: "Kaaba", altAr: "الكعبة", sortOrder: 0, isCover: true },
          { itemId: item.id, url: images.madinah, altEn: "Madinah", altAr: "المدينة", sortOrder: 1 },
        ],
      });
    }
  }

  const hotels = [
    {
      titleEn: "Haram View Hotel Makkah",
      titleAr: "فندق إطلالة الحرم مكة",
      city: "MAKKAH",
      stars: 5,
      descriptionEn: "Luxury 5-star hotel with direct views of Masjid al-Haram.",
      descriptionAr: "فندق فاخر 5 نجوم مع إطلالة مباشرة على المسجد الحرام.",
      imageUrl: images.hotel,
      sortOrder: 1,
    },
    {
      titleEn: "Nabawi Grand Hotel",
      titleAr: "فندق النبوي الكبير",
      city: "MADINAH",
      stars: 5,
      descriptionEn: "Premium accommodation steps from Masjid Nabawi.",
      descriptionAr: "إقامة فاخرة على خطوات من المسجد النبوي.",
      imageUrl: images.mosque,
      sortOrder: 2,
    },
  ];

  await prisma.contentItem.deleteMany({ where: { contentTypeId: listingsType.id } });
  for (const hotel of hotels) {
    const { city, stars, imageUrl, ...rest } = hotel;
    const item = await prisma.contentItem.create({
      data: {
        contentTypeId: listingsType.id,
        ...rest,
        attributes: { city, stars },
        status: "PUBLISHED",
        isVisible: true,
        featuredImageUrl: imageUrl,
      },
    });
    if (imageUrl) {
      await prisma.contentItemMedia.create({
        data: { itemId: item.id, url: imageUrl, isCover: true, sortOrder: 0 },
      });
    }
  }

  const services = [
    { offeringType: "AIRPORT_PICKUP", titleEn: "Airport Pickup", titleAr: "استقبال المطار", descriptionEn: "Seamless airport reception and transfer to your hotel.", descriptionAr: "استقبال سلس في المطار والانتقال إلى فندقك.", icon: "plane", sortOrder: 1 },
    { offeringType: "TRANSPORT", titleEn: "Makkah Transport", titleAr: "نقل مكة", descriptionEn: "Comfortable transport between holy sites in Makkah.", descriptionAr: "نقل مريح بين المواقع المقدسة في مكة.", icon: "bus", sortOrder: 2 },
    { offeringType: "TRANSPORT", titleEn: "Madinah Transport", titleAr: "نقل المدينة", descriptionEn: "Premium vehicles for Ziyarat and inter-city travel.", descriptionAr: "مركبات فاخرة للزيارات والسفر بين المدن.", icon: "car", sortOrder: 3 },
    { offeringType: "HOTEL", titleEn: "Hotel Booking", titleAr: "حجز الفنادق", descriptionEn: "Curated hotel partnerships near the Haramain.", descriptionAr: "شراكات فندقية مختارة قرب الحرمين.", icon: "hotel", sortOrder: 4 },
  ];

  await prisma.contentItem.deleteMany({ where: { contentTypeId: offeringsType.id } });
  for (const service of services) {
    const { offeringType, icon, ...rest } = service;
    await prisma.contentItem.create({
      data: {
        contentTypeId: offeringsType.id,
        ...rest,
        attributes: { offeringType, icon },
        status: "PUBLISHED",
        isVisible: true,
      },
    });
  }
}
