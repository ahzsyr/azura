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
      title: "Welcome to our website",
      subtitle: "Discover our services and solutions",
      badge: "Trusted partner",
      ctaLabel: "Get started",
      ctaHref: "/contact",
      secondaryCtaLabel: "View packages",
      secondaryCtaHref: "/packages",
      layout: "centered",
    }),
    featureGrid({
      title: "Our services",
      subtitle: "Everything you need in one place",
      columns: 3,
      items: [
        {
          title: "Planning",
          description: "Personalized guidance for your goals.",
          icon: "fa-map",
          href: "/services",
        },
        {
          title: "Packages",
          description: "Curated options for every need.",
          icon: "fa-suitcase",
          href: "/packages",
        },
        {
          title: "Support",
          description: "Responsive help when you need it.",
          icon: "fa-headset",
          href: "/contact",
        },
      ],
    }),
    catalog({
      source: "packages",
      title: "Featured packages",
      subtitle: "Handpicked highlights",
      limit: 6,
      featuredOnly: true,
      viewAllHref: "/packages",
    }),
    statsCounter({
      title: "Why choose us",
      items: [
        { value: 10, suffix: "+", label: "Years of experience"},
        { value: 100, suffix: "+", label: "Happy clients"},
        { value: 24, suffix: "/7", label: "Support"},
      ],
    }),
    testimonialsBlock({
      title: "What clients say",
      subtitle: "Real feedback from our community",
      collectionSlug: "default",
    }),
    cta({
      title: "Ready to get started?",
      subtitle: "Contact us today and we will help you take the next step.",
      button: "Contact us",
      href: "/contact",
    }),
  ]),

  about: buildTemplate([
    hero({
      title: "About us",
      subtitle: "Learn more about our story and mission",
      ctaLabel: "Contact us",
      ctaHref: "/contact",
    }),
    advancedRichText({
      html:
        "<p>We are dedicated to delivering exceptional experiences for every client.</p><h3>Our vision</h3><p>To be a trusted partner known for quality, integrity, and innovation.</p><h3>Our mission</h3><p>To provide reliable services that help our customers succeed.</p>",
    }),
    benefitsGrid({
      title: "Our values",
      layout: "cards",
      items: [
        {
          title: "Trust",
          description: "Honesty and transparency in every interaction.",
          icon: "fa-handshake",
        },
        {
          title: "Quality",
          description: "High standards across everything we deliver.",
          icon: "fa-star",
        },
        {
          title: "Service",
          description: "Putting customer needs at the center.",
          icon: "fa-heart",
        },
      ],
    }),
    richText({
      content: "<p><em>We look forward to serving you.</em></p>",
    }),
  ]),

  contact: buildTemplate([
    hero({
      title: "Contact us",
      subtitle: "We are here to help",
    }),
    inquiryForm({
      title: "Send a message",
      type: "CONTACT",
    }),
    richText({
      content: "<p>Reach out by phone, email, or the form above.</p>",
    }),
  ]),

  faq: buildTemplate([
    hero({
      title: "Frequently asked questions",
      subtitle: "Quick answers to common questions",
    }),
    faqBlock({
      title: "FAQ",
      faqSetSlug: "general",
    }),
  ]),

  gallery: buildTemplate([
    hero({
      title: "Gallery",
      subtitle: "Browse our visual collection",
    }),
    masonryGallery({
      title: "Photo gallery",
      subtitle: "Highlights from our work",
      gallerySlug: "default",
    }),
  ]),

  testimonials: buildTemplate([
    hero({
      title: "Testimonials",
      subtitle: "Stories from people we have helped",
    }),
    testimonialsBlock({
      title: "Client reviews",
      collectionSlug: "default",
      limit: 12,
    }),
  ]),

  packages: buildTemplate([
    hero({
      title: "Packages",
      subtitle: "Explore our offerings",
      ctaLabel: "Custom package",
      ctaHref: "/contact",
    }),
    catalog({
      source: "packages",
      title: "All packages",
      limit: 12,
      viewAllHref: "/packages",
    }),
    faqBlock({
      title: "Package FAQ",
      faqSetSlug: "packages",
    }),
  ]),

  hotels: buildTemplate([
    hero({
      title: "Hotels & transport",
      subtitle: "Accommodation and travel arrangements",
    }),
    catalog({
      source: "hotels",
      title: "Partner hotels",
      limit: 6,
    }),
    catalog({
      source: "services",
      title: "Transport options",
      limit: 6,
    }),
  ]),

  products: buildTemplate([
    hero({
      title: "Products",
      subtitle: "Browse our catalog",
    }),
    makeBlock("productGrid", {
      title: "All products",
      subtitle: "",
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
      title: "Collections",
      subtitle: "Curated product collections",
    }),
    makeBlock("categoryExplorer", {
      title: "Browse collections",
      subtitle: "",
      layout: "grid",
      columns: 3,
      showProductCount: true,
    }),
  ]),

  services: buildTemplate([
    hero({
      title: "Services",
      subtitle: "What we offer",
    }),
    featureGrid({
      title: "Our offerings",
      columns: 2,
      items: [
        {
          title: "Consultation",
          description: "Expert advice tailored to your needs.",
          icon: "fa-comments",
          href: "/contact",
        },
        {
          title: "Implementation",
          description: "End-to-end delivery with care.",
          icon: "fa-cogs",
          href: "/contact",
        },
      ],
    }),
    catalog({
      source: "services",
      title: "Service catalog",
      limit: 6,
    }),
  ]),

  compare: buildTemplate([
    hero({
      title: "Compare",
      subtitle: "Side-by-side comparison",
    }),
    makeBlock("productComparison", {
      title: "Compare items",
      productSlugs: [],
      layout: "table",
      highlightDifferences: true,
    }),
  ]),

  favorites: buildTemplate([
    hero({
      title: "Favorites",
      subtitle: "Your saved items",
    }),
    makeBlock("recentlyViewed", {
      title: "Saved for later",
      subtitle: "",
      limit: 8,
      emptyMessage: "No favorites yet.",
    }),
  ]),

  account: buildTemplate([
    hero({
      title: "My account",
      subtitle: "Manage your profile and orders",
    }),
    richText({
      content: "<p>Sign in to view your account dashboard.</p>",
    }),
  ]),
};
