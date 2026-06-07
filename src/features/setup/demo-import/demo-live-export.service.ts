import { prisma } from "@/lib/prisma";
import { customProfileId } from "./profile-id";
import type { SerializedDemoProfile } from "./serialized-profile.schema";
import type { BlockNode } from "@/types/builder";
import type { FormTemplateDefinition } from "@/features/forms/types";

export async function exportLiveSiteSnapshot(
  slug: string,
  displayName?: string
): Promise<SerializedDemoProfile> {
  const [
    company,
    themePublished,
    headerRow,
    footerRow,
    cmsPages,
    mediaAssets,
    formTemplates,
    faqSets,
    testimonials,
    testimonialCollections,
    galleries,
    contentItems,
    postCategories,
    posts,
    contentTypes,
  ] = await Promise.all([
    prisma.companyInfo.findUnique({ where: { id: "default" } }),
    prisma.siteTheme.findUnique({ where: { id: "published" } }),
    prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace: "header-workspace", key: "default" } },
    }),
    prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace: "footer-workspace", key: "default" } },
    }),
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { slug: "asc" },
    }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.formTemplate.findMany({ where: { isPublished: true } }),
    prisma.faqSet.findMany({ include: { items: { orderBy: { sortOrder: "asc" } } } }),
    prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.testimonialCollection.findMany({
      include: { items: { orderBy: { sortOrder: "asc" }, include: { testimonial: true } } },
    }),
    prisma.gallery.findMany({ include: { media: { orderBy: { sortOrder: "asc" } } } }),
    prisma.contentItem.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      include: { media: { where: { isCover: true }, take: 1 }, contentType: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.postCategory.findMany(),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      include: { categories: true, featuredImage: true },
    }),
    prisma.contentType.findMany({
      where: { slug: { in: ["catalog-items", "listings", "offerings"] } },
    }),
  ]);

  if (!company) throw new Error("Company info not found");

  const mediaKeyByUrl = new Map<string, string>();
  const mediaFiles = mediaAssets.map((asset, i) => {
    const key = `media-${i + 1}`;
    mediaKeyByUrl.set(asset.url, key);
    return {
      key,
      url: asset.url,
      filename: asset.filename,
      altEn: asset.altEn,
      altAr: asset.altAr,
    };
  });

  const testimonialIndexById = new Map(testimonials.map((t, i) => [t.id, i]));

  const brandConfig =
    themePublished?.brandConfig && typeof themePublished.brandConfig === "object"
      ? (themePublished.brandConfig as Record<string, unknown>)
      : {};

  const headerConfig =
    themePublished?.headerConfig && typeof themePublished.headerConfig === "object"
      ? (themePublished.headerConfig as Record<string, unknown>)
      : {};

  const footerConfig =
    themePublished?.footerConfig && typeof themePublished.footerConfig === "object"
      ? (themePublished.footerConfig as Record<string, unknown>)
      : {};

  const typeSlugSet = new Set(contentTypes.map((t) => t.slug));

  const snapshot: SerializedDemoProfile = {
    meta: {
      id: customProfileId(slug),
      displayName: displayName?.trim() || company.name,
      description: `Live site snapshot exported ${new Date().toISOString().slice(0, 10)}`,
      presetId:
        (themePublished?.activePresetId as string | null) ??
        (themePublished?.preset as string) ??
        "CLASSIC",
      siteName: company.name,
      tagline: company.taglineEn,
      taglineAr: company.taglineAr,
    },
    company: {
      name: company.name,
      taglineEn: company.taglineEn,
      taglineAr: company.taglineAr,
      storyEn: company.storyEn,
      storyAr: company.storyAr,
      missionEn: company.missionEn,
      missionAr: company.missionAr,
      visionEn: company.visionEn,
      visionAr: company.visionAr,
      valuesEn: (company.valuesEn as string[]) ?? [],
      valuesAr: (company.valuesAr as string[]) ?? [],
      registrationNo: company.registrationNo,
      licenseInfo: company.licenseInfo,
      addressEn: company.addressEn,
      addressAr: company.addressAr,
      phone: company.phone,
      whatsapp: company.whatsapp,
      email: company.email,
      officeHoursEn: company.officeHoursEn,
      officeHoursAr: company.officeHoursAr,
      socialLinks: (company.socialLinks as Record<string, string>) ?? {},
      trustBadges: (company.trustBadges as { labelEn: string; labelAr: string; icon?: string }[]) ?? [],
    },
    theme: {
      presetId:
        (themePublished?.activePresetId as string | null) ??
        (themePublished?.preset as string) ??
        "CLASSIC",
      brandConfig: {
        name: String(brandConfig.name ?? company.name),
        shortName: String(brandConfig.shortName ?? company.name.slice(0, 3).toUpperCase()),
        tagline: String(brandConfig.tagline ?? company.taglineEn),
        logoMode: (brandConfig.logoMode as "text" | "image") ?? "text",
        logoText: String(brandConfig.logoText ?? company.name.slice(0, 3).toUpperCase()),
        showTagline: Boolean(brandConfig.showTagline ?? true),
      },
      headerConfig: {
        showLogo: Boolean(headerConfig.showLogo ?? true),
        showNav: Boolean(headerConfig.showNav ?? true),
        showSearch: Boolean(headerConfig.showSearch ?? true),
        showCta: Boolean(headerConfig.showCta ?? true),
        sticky: Boolean(headerConfig.sticky ?? true),
        ctaLabelEn: String(headerConfig.ctaLabelEn ?? "Contact"),
        ctaLabelAr: String(headerConfig.ctaLabelAr ?? "تواصل"),
        ctaHref: String(headerConfig.ctaHref ?? "/contact"),
      },
      footerConfig: {
        columns: Number(footerConfig.columns ?? 3),
        showSocial: Boolean(footerConfig.showSocial ?? true),
        showQuickLinks: Boolean(footerConfig.showQuickLinks ?? true),
        showContact: Boolean(footerConfig.showContact ?? true),
        taglineEn: String(footerConfig.taglineEn ?? company.taglineEn),
        taglineAr: String(footerConfig.taglineAr ?? company.taglineAr),
      },
    },
    header: (headerRow?.data ?? {}) as Record<string, unknown>,
    footer: (footerRow?.data ?? {}) as Record<string, unknown>,
    mediaFiles,
    sampleData: {
      faqSets: faqSets.map((set) => ({
        slug: set.slug,
        titleEn: set.titleEn,
        titleAr: set.titleAr,
        items: set.items.map((item) => ({
          questionEn: item.questionEn,
          questionAr: item.questionAr,
          answerEn: item.answerEn,
          answerAr: item.answerAr,
        })),
      })),
      testimonials: testimonials.map((t) => ({
        name: t.name,
        location: t.location,
        rating: t.rating,
        contentEn: t.contentEn,
        contentAr: t.contentAr,
        imageKey: t.imageUrl ? mediaKeyByUrl.get(t.imageUrl) : undefined,
      })),
      testimonialCollections: testimonialCollections.map((col) => ({
        slug: col.slug,
        titleEn: col.titleEn,
        titleAr: col.titleAr,
        testimonialIndexes: col.items
          .map((item) => testimonialIndexById.get(item.testimonialId))
          .filter((idx): idx is number => idx !== undefined),
      })),
      galleries: galleries.map((gallery) => ({
        slug: gallery.slug,
        titleEn: gallery.titleEn,
        titleAr: gallery.titleAr,
        media: gallery.media.map((m) => ({
          titleEn: m.titleEn,
          titleAr: m.titleAr,
          mediaKey: mediaKeyByUrl.get(m.mediaUrl) ?? mediaFiles[0]?.key ?? "media-1",
        })),
      })),
      contentItems: contentItems
        .filter((item) => typeSlugSet.has(item.contentType.slug))
        .map((item) => ({
          slug: item.slug ?? `item-${item.id}`,
          contentTypeSlug: item.contentType.slug as "catalog-items" | "listings" | "offerings",
          titleEn: item.titleEn,
          titleAr: item.titleAr,
          excerptEn: item.excerptEn,
          excerptAr: item.excerptAr,
          descriptionEn: item.descriptionEn,
          descriptionAr: item.descriptionAr,
          attributes: (item.attributes as Record<string, unknown>) ?? {},
          imageKey: item.media[0]?.url ? mediaKeyByUrl.get(item.media[0].url) : undefined,
          isFeatured: item.isFeatured,
        })),
      formTemplates: formTemplates.map((form) => ({
        slug: form.slug,
        name: form.name,
        category: form.category,
        definition: form.definition as FormTemplateDefinition,
      })),
      posts: posts.map((post) => ({
        slug: post.slug,
        titleEn: post.titleEn,
        titleAr: post.titleAr,
        excerptEn: post.excerptEn ?? "",
        excerptAr: post.excerptAr ?? "",
        contentEn: post.contentEn ?? "",
        contentAr: post.contentAr ?? "",
        imageKey: post.featuredImage?.url
          ? mediaKeyByUrl.get(post.featuredImage.url)
          : undefined,
        categorySlug: post.categories[0]?.categoryId
          ? postCategories.find((c) => c.id === post.categories[0]?.categoryId)?.slug
          : undefined,
      })),
      postCategories: postCategories.map((cat) => ({
        slug: cat.slug,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
      })),
    },
    pages: cmsPages.map((page) => ({
      slug: page.slug,
      templateKey: page.templateKey ?? "default",
      titleEn: page.titleEn,
      titleAr: page.titleAr,
      excerptEn: page.excerptEn ?? undefined,
      excerptAr: page.excerptAr ?? undefined,
      blocks: (Array.isArray(page.blocks) ? page.blocks : []) as BlockNode[],
    })),
  };

  return snapshot;
}
