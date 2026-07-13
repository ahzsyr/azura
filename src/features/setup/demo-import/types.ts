import type { FooterWorkspace } from "@/features/footer/types";
import type { HeaderWorkspace } from "@/features/navigation/types";
import type { BlockNode } from "@/types/builder";
import type { FormTemplateDefinition } from "@/features/forms/types";

export type InstallMode = "blank" | "demo-brt" | "demo-safar";

export type DemoProfileMeta = {
  id: string;
  displayName: string;
  description: string;
  presetId: string;
  siteName: string;
  tagline: string;
};

export type DemoCompanyInfo = {
  name: string;
  tagline: string;
  story: string;
  mission: string;
  vision: string;
  values: string[];
  registrationNo: string;
  licenseInfo: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  officeHours: string;
  socialLinks: Record<string, string>;
  trustBadges: { label: string; icon?: string }[];
};

export type DemoThemeConfig = {
  presetId: string;
  brandConfig: {
    name: string;
    shortName: string;
    tagline: string;
    logoMode: "text" | "image";
    logoText: string;
    showTagline: boolean;
  };
  headerConfig: {
    showLogo: boolean;
    showNav: boolean;
    showSearch: boolean;
    showCta: boolean;
    sticky: boolean;
    ctaLabel: string;
    ctaHref: string;
  };
  footerConfig: {
    columns: number;
    showSocial: boolean;
    showQuickLinks: boolean;
    showContact: boolean;
    tagline: string;
  };
};

export type DemoMediaFile = {
  key: string;
  url: string;
  filename: string;
  alt: string;
};

export type DemoFaqItem = {
  question: string;
  answer: string;
};

export type DemoFaqSet = {
  slug: string;
  title: string;
  items: DemoFaqItem[];
};

export type DemoTestimonial = {
  name: string;
  location: string;
  rating: number;
  content: string;
  imageKey?: string;
};

export type DemoTestimonialCollection = {
  slug: string;
  title: string;
  testimonialIndexes: number[];
};

export type DemoGalleryMedia = {
  title: string;
  mediaKey: string;
};

export type DemoGallery = {
  slug: string;
  title: string;
  media: DemoGalleryMedia[];
};

export type DemoContentItem = {
  slug: string;
  contentTypeSlug: "catalog-items" | "listings" | "offerings";
  title: string;
  excerpt: string;
  description: string;
  attributes: Record<string, unknown>;
  imageKey?: string;
  isFeatured?: boolean;
};

export type DemoFormTemplate = {
  slug: string;
  name: string;
  category: "GENERAL" | "CONTACT" | "LEAD" | "MULTI_STEP";
  definition: FormTemplateDefinition;
};

export type DemoPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** Legacy HTML body in demo profiles — converted to blocks on import. */
  content?: string;
  imageKey?: string;
  categorySlug?: string;
};

export type DemoPostCategory = {
  slug: string;
  name: string;
};

export type DemoSampleData = {
  faqSets: DemoFaqSet[];
  testimonials: DemoTestimonial[];
  testimonialCollections: DemoTestimonialCollection[];
  galleries: DemoGallery[];
  contentItems: DemoContentItem[];
  formTemplates: DemoFormTemplate[];
  posts: DemoPost[];
  postCategories: DemoPostCategory[];
};

export type DemoPageDefinition = {
  slug: string;
  templateKey: string;
  title: string;
  excerpt?: string;
  buildBlocks: (ctx: DemoBlockContext) => BlockNode[];
};

export type DemoBlockContext = {
  media: Record<string, { id: string; url: string }>;
  formTemplates: Record<string, { id: string; slug: string }>;
  faqSets: Record<string, string>;
  galleries: Record<string, string>;
  testimonialCollections: Record<string, string>;
};

export type DemoProfile = {
  meta: DemoProfileMeta;
  company: DemoCompanyInfo;
  theme: DemoThemeConfig;
  header: HeaderWorkspace;
  footer: FooterWorkspace;
  mediaFiles: DemoMediaFile[];
  sampleData: DemoSampleData;
  pages: DemoPageDefinition[];
};

export type DemoImportOverrides = {
  siteName?: string;
  tagline?: string;
  siteUrl?: string;
  adminEmail?: string;
};

export type { SerializedDemoProfile, SerializedDemoPage } from "./serialized-profile.schema";

/** Resolved profile ready for import — pages have static blocks. */
export type ResolvedDemoProfile = {
  meta: DemoProfileMeta;
  company: DemoCompanyInfo;
  theme: DemoThemeConfig;
  header: HeaderWorkspace;
  footer: FooterWorkspace;
  mediaFiles: DemoMediaFile[];
  sampleData: DemoSampleData;
  pages: {
    slug: string;
    templateKey: string;
    title: string;
    excerpt?: string;
    blocks: BlockNode[];
  }[];
};

export type DemoProfileListItem = {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  siteName: string;
  tagline: string;
  presetId: string;
  source: "builtin" | "custom";
  pageCount: number;
  updatedAt: string | null;
  editable: boolean;
  deletable: boolean;
};

export type DemoApplyPreview = {
  profileId: string;
  displayName: string;
  pageSlugs: string[];
  wipeCounts: {
    posts: number;
    forms: number;
    faqs: number;
    testimonials: number;
    galleries: number;
    contentItems: number;
    mediaAssets: number;
  };
};
