import { prisma } from "@/lib/prisma";
import { customProfileId } from "./profile-id";
import type { SerializedDemoProfile } from "./serialized-profile.schema";
import type { BlockNode } from "@/types/builder";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { loadCompanyInfoWithTranslations, cmsPageLegacyFields } from "@/features/translation/admin-entity-helpers";
import type { CompanyInfoView } from "@/features/translation/admin-entity-helpers";
import { readAdminDefaultLocaleField } from "@/features/translation/admin-localized-view";
import { loadTranslationsMap, mergeCanonicalFields } from "@/features/translation/bilingual-serialize";
import type {
  CmsPage,
  ContentType,
  FormTemplate,
  JsonStore,
  MediaAsset,
  PostCategory,
  SiteTheme,
  Testimonial,
  Prisma,
} from "@prisma/client";

type LiveExportQueryResult = [
  CompanyInfoView | null,
  SiteTheme | null,
  JsonStore | null,
  JsonStore | null,
  CmsPage[],
  MediaAsset[],
  FormTemplate[],
  Prisma.FaqSetGetPayload<{ include: { items: true } }>[],
  Testimonial[],
  Prisma.TestimonialCollectionGetPayload<{
    include: { items: { include: { testimonial: true } } };
  }>[],
  Prisma.GalleryGetPayload<{ include: { media: true } }>[],
  Prisma.ContentItemGetPayload<{ include: { media: true; contentType: true } }>[],
  PostCategory[],
  Prisma.PostGetPayload<{ include: { categories: true; featuredImage: true } }>[],
  ContentType[],
];

function entityIds(rows: ReadonlyArray<{ id: string }>): string[] {
  return rows.map((row) => row.id);
}

function legacyFrom(
  map: Map<string, import("@prisma/client").EntityTranslation[]>,
  entityId: string,
  fields: string[]
) {
  const translations = map.get(entityId) ?? [];
  const canonical = mergeCanonicalFields(translations, fields);
  const out: Record<string, string> = {};
  for (const field of fields) {
    out[field] = canonical[field] ?? "";
  }
  return out;
}

function parseValuesField(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw ? raw.split("\n").map((s: string) => s.trim()).filter(Boolean) : [];
  }
}

export async function exportLiveSiteSnapshot(
  slug: string,
  displayName?: string
): Promise<SerializedDemoProfile> {
  const [
    companyView,
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
  ] = (await Promise.all([
    loadCompanyInfoWithTranslations(),
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
  ])) as LiveExportQueryResult;

  if (!companyView) throw new Error("Company info not found");
  const companyLegacy = companyView as Record<string, unknown>;
  const companyField = (field: string) => readAdminDefaultLocaleField(companyLegacy, field, "");

  const [
    cmsTranslations,
    mediaTranslations,
    faqSetTranslations,
    faqItemTranslations,
    testimonialTranslations,
    testimonialCollectionTranslations,
    galleryTranslations,
    galleryMediaTranslations,
    contentItemTranslations,
    postCategoryTranslations,
    postTranslations,
  ] = await Promise.all([
    loadTranslationsMap("CmsPage", entityIds(cmsPages)),
    loadTranslationsMap("MediaAsset", entityIds(mediaAssets)),
    loadTranslationsMap("FaqSet", entityIds(faqSets)),
    loadTranslationsMap("FaqItem", entityIds(faqSets.flatMap((s) => s.items))),
    loadTranslationsMap("Testimonial", entityIds(testimonials)),
    loadTranslationsMap("TestimonialCollection", entityIds(testimonialCollections)),
    loadTranslationsMap("Gallery", entityIds(galleries)),
    loadTranslationsMap("GalleryMedia", entityIds(galleries.flatMap((g) => g.media))),
    loadTranslationsMap("ContentItem", entityIds(contentItems)),
    loadTranslationsMap("PostCategory", entityIds(postCategories)),
    loadTranslationsMap("Post", entityIds(posts)),
  ]);

  const mediaKeyByUrl = new Map<string, string>();
  const mediaFiles = mediaAssets.map((asset, i) => {
    const key = `media-${i + 1}`;
    mediaKeyByUrl.set(asset.url, key);
    const alt = legacyFrom(mediaTranslations, asset.id, ["alt"]);
    return {
      key,
      url: asset.url,
      filename: asset.filename,
      alt: alt.alt,
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
      displayName: displayName?.trim() || companyView.name,
      description: `Live site snapshot exported ${new Date().toISOString().slice(0, 10)}`,
      presetId:
        ((themePublished as { siteDefaultPresetId?: string | null } | null)?.siteDefaultPresetId as string | null) ??
        (themePublished?.preset as string) ??
        "CLASSIC",
      siteName: companyView.name,
      tagline: companyField("tagline"),
    },
    company: {
      name: companyView.name,
      tagline: companyField("tagline"),
      story: companyField("story"),
      mission: companyField("mission"),
      vision: companyField("vision"),
      values: parseValuesField(companyField("values")),
      registrationNo: companyView.registrationNo,
      licenseInfo: companyView.licenseInfo,
      address: companyField("address"),
      phone: companyView.phone,
      whatsapp: companyView.whatsapp,
      email: companyView.email,
      officeHours: companyField("officeHours"),
      socialLinks: (companyView.socialLinks as Record<string, string>) ?? {},
      trustBadges: (companyView.trustBadges as { label: string; icon?: string }[]) ?? [],
    },
    theme: {
      presetId:
        ((themePublished as { siteDefaultPresetId?: string | null } | null)?.siteDefaultPresetId as string | null) ??
        (themePublished?.preset as string) ??
        "CLASSIC",
      brandConfig: {
        name: String(brandConfig.name ?? companyView.name),
        shortName: String(brandConfig.shortName ?? companyView.name.slice(0, 3).toUpperCase()),
        tagline: String(brandConfig.tagline ?? companyField("tagline")),
        logoMode: (brandConfig.logoMode as "text" | "image") ?? "text",
        logoText: String(brandConfig.logoText ?? companyView.name.slice(0, 3).toUpperCase()),
        showTagline: Boolean(brandConfig.showTagline ?? true),
      },
      headerConfig: {
        showLogo: Boolean(headerConfig.showLogo ?? true),
        showNav: Boolean(headerConfig.showNav ?? true),
        showSearch: Boolean(headerConfig.showSearch ?? true),
        showCta: Boolean(headerConfig.showCta ?? true),
        sticky: Boolean(headerConfig.sticky ?? true),
        ctaLabel: String(headerConfig.ctaLabel ?? "Contact"),
        ctaHref: String(headerConfig.ctaHref ?? "/contact"),
      },
      footerConfig: {
        columns: Number(footerConfig.columns ?? 3),
        showSocial: Boolean(footerConfig.showSocial ?? true),
        showQuickLinks: Boolean(footerConfig.showQuickLinks ?? true),
        showContact: Boolean(footerConfig.showContact ?? true),
        tagline: String(footerConfig.tagline ?? companyField("tagline")),
      },
    },
    header: (headerRow?.data ?? {}) as Record<string, unknown>,
    footer: (footerRow?.data ?? {}) as Record<string, unknown>,
    mediaFiles,
    sampleData: {
      faqSets: faqSets.map((set) => {
        const title = legacyFrom(faqSetTranslations, set.id, ["title"]);
        return {
          slug: set.slug,
          title: title.title,
          items: set.items.map((item) => {
            const qa = legacyFrom(faqItemTranslations, item.id, ["question", "answer"]);
            return {
              question: qa.question,
              answer: qa.answer,
            };
          }),
        };
      }),
      testimonials: testimonials.map((t) => {
        const quote = legacyFrom(testimonialTranslations, t.id, ["quote"]);
        return {
          name: t.name,
          location: t.location,
          rating: t.rating,
          content: quote.quote,
          imageKey: t.imageUrl ? mediaKeyByUrl.get(t.imageUrl) : undefined,
        };
      }),
      testimonialCollections: testimonialCollections.map((col) => {
        const title = legacyFrom(testimonialCollectionTranslations, col.id, ["title"]);
        return {
          slug: col.slug,
          title: title.title,
          testimonialIndexes: col.items
            .map((item) => testimonialIndexById.get(item.testimonialId))
            .filter((idx): idx is number => idx !== undefined),
        };
      }),
      galleries: galleries.map((gallery) => {
        const title = legacyFrom(galleryTranslations, gallery.id, ["title"]);
        return {
          slug: gallery.slug,
          title: title.title,
          media: gallery.media.map((m) => {
            const mediaTitle = legacyFrom(galleryMediaTranslations, m.id, ["title"]);
            return {
              title: mediaTitle.title,
              mediaKey: mediaKeyByUrl.get(m.mediaUrl) ?? mediaFiles[0]?.key ?? "media-1",
            };
          }),
        };
      }),
      contentItems: contentItems
        .filter((item) => typeSlugSet.has(item.contentType.slug))
        .map((item) => {
          const text = legacyFrom(contentItemTranslations, item.id, [
            "title",
            "excerpt",
            "description",
          ]);
          return {
            slug: item.slug ?? `item-${item.id}`,
            contentTypeSlug: item.contentType.slug as "catalog-items" | "listings" | "offerings",
            title: text.title,
            excerpt: text.excerpt,
            description: text.description,
            attributes: (item.attributes as Record<string, unknown>) ?? {},
            imageKey: item.media[0]?.url ? mediaKeyByUrl.get(item.media[0].url) : undefined,
            isFeatured: item.isFeatured,
          };
        }),
      formTemplates: formTemplates.map((form) => ({
        slug: form.slug,
        name: form.name,
        category: form.category,
        definition: form.definition as FormTemplateDefinition,
      })),
      posts: posts.map((post) => {
        const text = legacyFrom(postTranslations, post.id, ["title", "excerpt"]);
        return {
          slug: post.slug,
          title: text.title,
          excerpt: text.excerpt ?? "",
          imageKey: post.featuredImage?.url
            ? mediaKeyByUrl.get(post.featuredImage.url)
            : undefined,
          categorySlug: post.categories[0]?.categoryId
            ? postCategories.find((c) => c.id === post.categories[0]?.categoryId)?.slug
            : undefined,
        };
      }),
      postCategories: postCategories.map((cat) => {
        const name = legacyFrom(postCategoryTranslations, cat.id, ["name"]);
        return {
          slug: cat.slug,
          name: name.name,
        };
      }),
    },
    pages: cmsPages.map((page) => {
      const legacy = cmsPageLegacyFields(cmsTranslations.get(page.id) ?? []);
      return {
        slug: page.slug,
        templateKey: page.templateKey ?? "default",
        title: legacy.titleEn,
        excerpt: legacy.excerptEn || undefined,
        blocks: (Array.isArray(page.blocks) ? page.blocks : []) as BlockNode[],
      };
    }),
  };

  return snapshot;
}
