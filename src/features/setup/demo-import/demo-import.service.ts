import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { applyDemoTheme } from "./apply-preset-to-theme";
import { resolveProfileById } from "./resolve-profile";
import type { DemoImportOverrides, ResolvedDemoProfile } from "./types";
import type { ProfileId } from "./profile-id";
import type { InstallMode } from "./types";

function buildBrandShortName(companyName: string, fallback?: string): string {
  const fromProfile = fallback?.trim();
  if (fromProfile) return fromProfile;
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length <= 6) return words[0].toUpperCase();
  const initials = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  return initials || companyName.slice(0, 3).toUpperCase();
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/** Supabase pooler latency can exceed Prisma's default 5s interactive transaction limit. */
const DEMO_IMPORT_TX_OPTIONS = { maxWait: 30_000, timeout: 120_000 };

async function hasExistingDemoContent(prisma: PrismaClient): Promise<boolean> {
  const [media, posts, forms, items, testimonials] = await Promise.all([
    prisma.mediaAsset.count(),
    prisma.post.count(),
    prisma.formTemplate.count(),
    prisma.contentItem.count(),
    prisma.testimonial.count(),
  ]);
  return media > 0 || posts > 0 || forms > 0 || items > 0 || testimonials > 0;
}

async function clearDemoContent(tx: Tx) {
  await tx.postTagOnPost.deleteMany();
  await tx.postCategoryOnPost.deleteMany();
  await tx.post.deleteMany();
  await tx.postCategory.deleteMany();
  await tx.postTag.deleteMany();
  await tx.postAuthor.deleteMany();
  await tx.formSubmission.deleteMany();
  await tx.formDraft.deleteMany();
  await tx.formTemplate.deleteMany();
  await tx.faqItem.deleteMany();
  await tx.faqSet.deleteMany();
  await tx.testimonialCollectionItem.deleteMany();
  await tx.testimonialCollection.deleteMany();
  await tx.testimonial.deleteMany();
  await tx.galleryMedia.deleteMany();
  await tx.gallery.deleteMany();
  await tx.contentItemMedia.deleteMany();
  await tx.contentCollectionItem.deleteMany();
  await tx.contentItem.deleteMany();
  await tx.contentCollection.deleteMany();
  await tx.mediaUsage.deleteMany();
  await tx.mediaAsset.deleteMany();
}

async function importMedia(
  tx: Tx,
  profile: ResolvedDemoProfile
): Promise<Record<string, { id: string; url: string }>> {
  const map: Record<string, { id: string; url: string }> = {};
  for (const file of profile.mediaFiles) {
    const asset = await tx.mediaAsset.create({
      data: {
        filename: file.filename,
        url: file.url,
        mimeType: file.url.endsWith(".svg") ? "image/svg+xml" : "image/jpeg",
        mediaType: file.url.endsWith(".svg") ? "SVG" : "IMAGE",
        sizeBytes: 0,
        altEn: file.altEn,
        altAr: file.altAr,
      },
    });
    map[file.key] = { id: asset.id, url: asset.url };
  }
  return map;
}

async function importFormTemplates(
  tx: Tx,
  profile: ResolvedDemoProfile
): Promise<Record<string, { id: string; slug: string }>> {
  const map: Record<string, { id: string; slug: string }> = {};
  for (const form of profile.sampleData.formTemplates) {
    const row = await tx.formTemplate.create({
      data: {
        name: form.name,
        slug: form.slug,
        category: form.category,
        definition: form.definition as Prisma.InputJsonValue,
        isPublished: true,
      },
    });
    map[form.slug] = { id: row.id, slug: row.slug };
  }
  return map;
}

async function importFaqSets(tx: Tx, profile: ResolvedDemoProfile): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const set of profile.sampleData.faqSets) {
    const row = await tx.faqSet.create({
      data: {
        slug: set.slug,
        titleEn: set.titleEn,
        titleAr: set.titleAr,
        isPublished: true,
        items: {
          create: set.items.map((item, i) => ({
            questionEn: item.questionEn,
            questionAr: item.questionAr,
            answerEn: item.answerEn,
            answerAr: item.answerAr,
            sortOrder: i,
            isPublished: true,
          })),
        },
      },
    });
    map[set.slug] = row.id;
  }
  return map;
}

async function importTestimonials(
  tx: Tx,
  profile: ResolvedDemoProfile,
  media: Record<string, { id: string; url: string }>
): Promise<Record<string, string>> {
  const testimonialIds: string[] = [];
  for (let i = 0; i < profile.sampleData.testimonials.length; i++) {
    const t = profile.sampleData.testimonials[i];
    const image = t.imageKey ? media[t.imageKey] : undefined;
    const row = await tx.testimonial.create({
      data: {
        name: t.name,
        location: t.location,
        rating: t.rating,
        contentEn: t.contentEn,
        contentAr: t.contentAr,
        imageUrl: image?.url ?? "",
        isPublished: true,
        sortOrder: i,
      },
    });
    testimonialIds.push(row.id);
  }

  const map: Record<string, string> = {};
  for (const col of profile.sampleData.testimonialCollections) {
    const row = await tx.testimonialCollection.create({
      data: {
        slug: col.slug,
        titleEn: col.titleEn,
        titleAr: col.titleAr,
        isPublished: true,
        items: {
          create: col.testimonialIndexes.map((idx, i) => ({
            testimonialId: testimonialIds[idx],
            sortOrder: i,
          })),
        },
      },
    });
    map[col.slug] = row.id;
  }
  return map;
}

async function importGalleries(
  tx: Tx,
  profile: ResolvedDemoProfile,
  media: Record<string, { id: string; url: string }>
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const gallery of profile.sampleData.galleries) {
    const row = await tx.gallery.create({
      data: {
        slug: gallery.slug,
        titleEn: gallery.titleEn,
        titleAr: gallery.titleAr,
        isPublished: true,
        media: {
          create: gallery.media.map((m, i) => {
            const asset = media[m.mediaKey];
            return {
              titleEn: m.titleEn,
              titleAr: m.titleAr,
              mediaUrl: asset?.url ?? "/images/placeholder.svg",
              mediaKind: "IMAGE" as const,
              sortOrder: i,
              isPublished: true,
            };
          }),
        },
      },
    });
    map[gallery.slug] = row.id;
  }
  return map;
}

async function importContentItems(
  tx: Tx,
  profile: ResolvedDemoProfile,
  media: Record<string, { id: string; url: string }>
) {
  const typeRows = await tx.contentType.findMany({
    where: { slug: { in: ["catalog-items", "listings", "offerings"] } },
  });
  const typeBySlug = Object.fromEntries(typeRows.map((t) => [t.slug, t.id]));

  for (let i = 0; i < profile.sampleData.contentItems.length; i++) {
    const item = profile.sampleData.contentItems[i];
    const typeId = typeBySlug[item.contentTypeSlug];
    if (!typeId) continue;

    const image = item.imageKey ? media[item.imageKey] : undefined;
    await tx.contentItem.create({
      data: {
        contentTypeId: typeId,
        slug: item.slug,
        titleEn: item.titleEn,
        titleAr: item.titleAr,
        excerptEn: item.excerptEn,
        excerptAr: item.excerptAr,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        attributes: item.attributes as Prisma.InputJsonValue,
        status: "PUBLISHED",
        isFeatured: item.isFeatured ?? false,
        isVisible: true,
        sortOrder: i,
        publishedAt: new Date(),
        media: image
          ? {
              create: {
                url: image.url,
                altEn: item.titleEn,
                altAr: item.titleAr,
                isCover: true,
                sortOrder: 0,
                isPublished: true,
              },
            }
          : undefined,
      },
    });
  }
}

async function importPosts(
  tx: Tx,
  profile: ResolvedDemoProfile,
  media: Record<string, { id: string; url: string }>
) {
  const categoryMap: Record<string, string> = {};
  for (const cat of profile.sampleData.postCategories) {
    const row = await tx.postCategory.create({
      data: { slug: cat.slug, nameEn: cat.nameEn, nameAr: cat.nameAr },
    });
    categoryMap[cat.slug] = row.id;
  }

  const author = await tx.postAuthor.create({
    data: {
      name: profile.meta.siteName,
      bioEn: `Editorial team at ${profile.meta.siteName}`,
      bioAr: `فريق التحرير في ${profile.meta.siteName}`,
    },
  });

  for (const post of profile.sampleData.posts) {
    const image = post.imageKey ? media[post.imageKey] : undefined;
    let featuredImageId: string | undefined;
    if (image) {
      const asset = await tx.mediaAsset.findUnique({ where: { id: image.id } });
      if (asset) featuredImageId = asset.id;
    }

    await tx.post.create({
      data: {
        slug: post.slug,
        titleEn: post.titleEn,
        titleAr: post.titleAr,
        excerptEn: post.excerptEn,
        excerptAr: post.excerptAr,
        contentEn: post.contentEn,
        contentAr: post.contentAr,
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: author.id,
        featuredImageId,
        categories: post.categorySlug
          ? { create: [{ categoryId: categoryMap[post.categorySlug] }] }
          : undefined,
      },
    });
  }
}

async function resetNonProfilePages(tx: Tx, profileSlugs: Set<string>) {
  const EMPTY_BLOCKS: Prisma.InputJsonValue = [];
  const pages = await tx.cmsPage.findMany({ select: { slug: true } });
  for (const page of pages) {
    if (profileSlugs.has(page.slug)) continue;
    await tx.cmsPage.update({
      where: { slug: page.slug },
      data: { status: "DRAFT", publishedAt: null, blocks: EMPTY_BLOCKS },
    });
  }
}

async function importPages(tx: Tx, profile: ResolvedDemoProfile) {
  const now = new Date();
  const profileSlugs = new Set(profile.pages.map((p) => p.slug));

  for (const page of profile.pages) {
    await tx.cmsPage.upsert({
      where: { slug: page.slug },
      update: {
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        excerptEn: page.excerptEn ?? "",
        excerptAr: page.excerptAr ?? "",
        templateKey: page.templateKey,
        status: "PUBLISHED",
        publishedAt: now,
        blocks: page.blocks as unknown as Prisma.InputJsonValue,
      },
      create: {
        slug: page.slug,
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        excerptEn: page.excerptEn ?? "",
        excerptAr: page.excerptAr ?? "",
        templateKey: page.templateKey,
        status: "PUBLISHED",
        publishedAt: now,
        blocks: page.blocks as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await resetNonProfilePages(tx, profileSlugs);
}

async function importWorkspaces(
  tx: Tx,
  profile: ResolvedDemoProfile,
  header?: HeaderWorkspace
) {
  for (const [namespace, data] of [
    ["header-workspace", header ?? profile.header],
    ["footer-workspace", profile.footer],
  ] as const) {
    await tx.jsonStore.upsert({
      where: { namespace_key: { namespace, key: "default" } },
      update: { data: data as unknown as Prisma.InputJsonValue },
      create: {
        namespace,
        key: "default",
        data: data as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

async function runImport(
  prisma: PrismaClient,
  profile: ResolvedDemoProfile,
  overrides: DemoImportOverrides = {}
): Promise<void> {
  const companyName = overrides.siteName?.trim() || profile.company.name;
  const taglineEn = overrides.tagline?.trim() || profile.company.taglineEn;
  const taglineAr = overrides.tagline?.trim() || profile.company.taglineAr;
  const contactEmail = overrides.adminEmail?.trim() || profile.company.email;

  const needsClear = await hasExistingDemoContent(prisma);

  await prisma.$transaction(async (tx) => {
    if (needsClear) {
      await clearDemoContent(tx);
    }

    await tx.companyInfo.upsert({
      where: { id: "default" },
      update: {
        name: companyName,
        taglineEn,
        taglineAr,
        storyEn: profile.company.storyEn,
        storyAr: profile.company.storyAr,
        missionEn: profile.company.missionEn,
        missionAr: profile.company.missionAr,
        visionEn: profile.company.visionEn,
        visionAr: profile.company.visionAr,
        valuesEn: profile.company.valuesEn,
        valuesAr: profile.company.valuesAr,
        registrationNo: profile.company.registrationNo,
        licenseInfo: profile.company.licenseInfo,
        addressEn: profile.company.addressEn,
        addressAr: profile.company.addressAr,
        phone: profile.company.phone,
        whatsapp: profile.company.whatsapp,
        email: contactEmail,
        officeHoursEn: profile.company.officeHoursEn,
        officeHoursAr: profile.company.officeHoursAr,
        socialLinks: profile.company.socialLinks as Prisma.InputJsonValue,
        trustBadges: profile.company.trustBadges as Prisma.InputJsonValue,
      },
      create: {
        id: "default",
        name: companyName,
        taglineEn,
        taglineAr,
        storyEn: profile.company.storyEn,
        storyAr: profile.company.storyAr,
        missionEn: profile.company.missionEn,
        missionAr: profile.company.missionAr,
        visionEn: profile.company.visionEn,
        visionAr: profile.company.visionAr,
        valuesEn: profile.company.valuesEn,
        valuesAr: profile.company.valuesAr,
        registrationNo: profile.company.registrationNo,
        licenseInfo: profile.company.licenseInfo,
        addressEn: profile.company.addressEn,
        addressAr: profile.company.addressAr,
        phone: profile.company.phone,
        whatsapp: profile.company.whatsapp,
        email: contactEmail,
        officeHoursEn: profile.company.officeHoursEn,
        officeHoursAr: profile.company.officeHoursAr,
        socialLinks: profile.company.socialLinks as Prisma.InputJsonValue,
        trustBadges: profile.company.trustBadges as Prisma.InputJsonValue,
      },
    });

    const logoShort = buildBrandShortName(
      companyName,
      profile.theme.brandConfig.shortName || profile.theme.brandConfig.logoText
    );
    const brandConfig = {
      ...profile.theme.brandConfig,
      name: companyName,
      shortName: logoShort,
      brandName: companyName,
      logoText: logoShort,
      tagline: taglineEn,
      showTagline: Boolean(taglineEn.trim()),
    };
    const themeConfig = {
      ...profile.theme,
      brandConfig,
    };
    const headerWorkspace: HeaderWorkspace = {
      ...profile.header,
      branding: normalizeBranding({
        ...profile.header.branding,
        brandName: companyName,
        logoText: logoShort,
        tagline: taglineEn,
        showTagline: Boolean(taglineEn.trim()),
      }),
    };
    await applyDemoTheme(tx, themeConfig);
    await importWorkspaces(tx, profile, headerWorkspace);

    const media = await importMedia(tx, profile);
    await importFormTemplates(tx, profile);
    await importFaqSets(tx, profile);
    await importTestimonials(tx, profile, media);
    await importGalleries(tx, profile, media);
    await importContentItems(tx, profile, media);
    await importPages(tx, profile);
    await importPosts(tx, profile, media);
  }, DEMO_IMPORT_TX_OPTIONS);
}

/** Apply a profile by ID (builtin or custom). */
export async function importDemoProfileById(
  prisma: PrismaClient,
  profileId: ProfileId,
  overrides: DemoImportOverrides = {}
): Promise<void> {
  const profile = await resolveProfileById(profileId);
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  await runImport(prisma, profile, overrides);
  try {
    const { setLastAppliedDemoProfile } = await import("./demo-profile-registry.service");
    await setLastAppliedDemoProfile(profileId, profile.meta.displayName);
  } catch (e) {
    console.warn("Last-applied demo profile tracking skipped:", e);
  }
}

/** Legacy entry — setup wizard and CLI seeds. */
export async function importDemoProfile(
  prisma: PrismaClient,
  mode: InstallMode,
  overrides: DemoImportOverrides = {}
): Promise<void> {
  if (mode === "blank") return;
  await importDemoProfileById(prisma, mode, overrides);
}
