import { z } from "zod";

const demoProfileMetaSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().default(""),
  presetId: z.string().min(1),
  siteName: z.string().min(1),
  tagline: z.string().default(""),
});

const demoCompanyInfoSchema = z.object({
  name: z.string().min(1),
  tagline: z.string(),
  story: z.string(),
  mission: z.string(),
  vision: z.string(),
  values: z.array(z.string()),
  registrationNo: z.string(),
  licenseInfo: z.string(),
  address: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string().email().or(z.literal("")),
  website: z.string().optional(),
  officeHours: z.string(),
  socialLinks: z.record(z.string()),
  trustBadges: z.array(
    z.object({
      label: z.string(),
      icon: z.string().optional(),
    })
  ),
});

const demoThemeConfigSchema = z.object({
  presetId: z.string(),
  brandConfig: z.object({
    name: z.string(),
    shortName: z.string(),
    tagline: z.string(),
    logoMode: z.enum(["text", "image"]),
    logoText: z.string(),
    showTagline: z.boolean(),
  }),
  headerConfig: z.object({
    showLogo: z.boolean(),
    showNav: z.boolean(),
    showSearch: z.boolean(),
    showCta: z.boolean(),
    sticky: z.boolean(),
    ctaLabel: z.string(),
    ctaHref: z.string(),
  }),
  footerConfig: z.object({
    columns: z.number(),
    showSocial: z.boolean(),
    showQuickLinks: z.boolean(),
    showContact: z.boolean(),
    tagline: z.string(),
  }),
});

const demoMediaFileSchema = z.object({
  key: z.string(),
  url: z.string(),
  filename: z.string(),
  alt: z.string(),
});

const demoFaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const demoSampleDataSchema = z.object({
  faqSets: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      items: z.array(demoFaqItemSchema),
    })
  ),
  testimonials: z.array(
    z.object({
      name: z.string(),
      location: z.string(),
      rating: z.number(),
      content: z.string(),
      imageKey: z.string().optional(),
    })
  ),
  testimonialCollections: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      testimonialIndexes: z.array(z.number()),
    })
  ),
  galleries: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      media: z.array(
        z.object({
          title: z.string(),
          mediaKey: z.string(),
        })
      ),
    })
  ),
  contentItems: z.array(
    z.object({
      slug: z.string(),
      contentTypeSlug: z.enum(["catalog-items", "listings", "offerings"]),
      title: z.string(),
      excerpt: z.string(),
      description: z.string(),
      attributes: z.record(z.unknown()),
      imageKey: z.string().optional(),
      isFeatured: z.boolean().optional(),
    })
  ),
  formTemplates: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      category: z.enum(["GENERAL", "CONTACT", "LEAD", "MULTI_STEP"]),
      definition: z.record(z.unknown()),
    })
  ),
  posts: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      excerpt: z.string(),
      content: z.string().optional(),
      imageKey: z.string().optional(),
      categorySlug: z.string().optional(),
    })
  ),
  postCategories: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
    })
  ),
});

const blockNodeSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      type: z.string(),
      version: z.string().optional(),
      props: z.record(z.unknown()).optional(),
      settings: z.record(z.unknown()).optional(),
      styles: z.record(z.unknown()).optional(),
      children: z.array(blockNodeSchema).optional(),
    })
    .passthrough()
);

const serializedDemoPageSchema = z.object({
  slug: z.string(),
  templateKey: z.string(),
  title: z.string(),
  excerpt: z.string().optional(),
  blocks: z.array(blockNodeSchema),
});

export const serializedDemoProfileSchema = z.object({
  meta: demoProfileMetaSchema,
  company: demoCompanyInfoSchema,
  theme: demoThemeConfigSchema,
  header: z.record(z.unknown()),
  footer: z.record(z.unknown()),
  mediaFiles: z.array(demoMediaFileSchema),
  sampleData: demoSampleDataSchema,
  pages: z.array(serializedDemoPageSchema),
});

export type SerializedDemoProfile = z.infer<typeof serializedDemoProfileSchema>;
export type SerializedDemoPage = z.infer<typeof serializedDemoPageSchema>;

export function parseSerializedDemoProfile(json: unknown): SerializedDemoProfile {
  return serializedDemoProfileSchema.parse(json);
}

export function parseSerializedDemoProfileJson(jsonString: string): SerializedDemoProfile {
  const parsed = JSON.parse(jsonString) as unknown;
  return parseSerializedDemoProfile(parsed);
}
