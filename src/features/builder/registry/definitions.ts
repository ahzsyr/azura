import type { BlockDefinition } from "@/types/block-system";
import { BLOCK_SYSTEM_VERSION } from "@/types/block-system";
import type { BlockType } from "@/types/builder";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import { BLOCK_TRANSLATABLE_FIELDS } from "@/features/translation/block-translation";

const BASE_META: Record<
  BlockType,
  Omit<BlockDefinition, "defaultSettings" | "translatableFields" | "componentKey">
> = {
  hero: {
    type: "hero",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Hero Pro",
    description: "Customizable hero with layouts, badges, dual CTAs, and video backgrounds",
    icon: "layout",
  },
  section: {
    type: "section",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Section",
    description: "Group blocks in a container",
    icon: "box",
  },
  rowSection: {
    type: "rowSection",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Row Section",
    description: "Place 2–4 blocks side-by-side in a customizable row layout",
    icon: "columns",
  },
  spacer: {
    type: "spacer",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Spacer",
    description: "Vertical spacing between blocks",
    icon: "move-vertical",
  },
  divider: {
    type: "divider",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Divider",
    description: "Horizontal line separator",
    icon: "minus",
  },
  text: {
    type: "text",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Text",
    description: "Simple text paragraph",
    icon: "type",
  },
  richText: {
    type: "richText",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Rich Text",
    description: "Formatted HTML content",
    icon: "file-text",
  },
  image: {
    type: "image",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Image",
    description: "Single image with optional caption",
    icon: "image",
  },
  gallery: {
    type: "gallery",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Gallery",
    description: "Grid from a linked gallery album",
    icon: "images",
  },
  video: {
    type: "video",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Video",
    description: "Embedded video player",
    icon: "video",
  },
  cta: {
    type: "cta",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "CTA Banner",
    description: "Conversion banner with countdown, backgrounds, and dual buttons",
    icon: "megaphone",
  },
  testimonials: {
    type: "testimonials",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Testimonials",
    description: "Customer reviews carousel",
    icon: "star",
  },
  pricing: {
    type: "pricing",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Pricing Table",
    description:
      "Display pricing plans, packages, subscriptions, or service tiers in a structured and visually appealing format. Supports feature comparisons, highlighted plans, billing options, discounts, badges, and call-to-action buttons.",
    icon: "dollar-sign",
  },
  inquiryForm: {
    type: "inquiryForm",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Inquiry Form",
    description: "Contact or visa inquiry form",
    icon: "mail",
  },
  catalog: {
    type: "catalog",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Catalog",
    description: "Unified packages, hotels, or services grid",
    icon: "layout-grid",
  },
  contentList: {
    type: "contentList",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Content List",
    description: "Generic content items from any collection or type",
    icon: "layers",
  },
  faq: {
    type: "faq",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "FAQ",
    description: "Frequently asked questions",
    icon: "help-circle",
  },
  customHtml: {
    type: "customHtml",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Custom HTML",
    description: "Raw HTML for advanced layouts",
    icon: "code",
  },
  advancedRichText: {
    type: "advancedRichText",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Advanced Rich Text",
    description: "WYSIWYG editor with callouts, buttons, and columns",
    icon: "file-text",
  },
  markdown: {
    type: "markdown",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Markdown",
    description: "Content written in Markdown with GFM support",
    icon: "file-code",
  },
  code: {
    type: "code",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Code Block",
    description: "Syntax-highlighted code snippets with copy button",
    icon: "terminal",
  },
  table: {
    type: "table",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Table",
    description: "Sortable, searchable data tables",
    icon: "table",
  },
  timeline: {
    type: "timeline",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Timeline",
    description: "Chronological events and milestones",
    icon: "git-branch",
  },
  changelog: {
    type: "changelog",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Release Notes",
    description:
      "Display product releases, updates, improvements, bug fixes, feature launches, and version histories in a structured timeline or version-based format. Supports categories, tags, release statuses, and changelog integration.",
    icon: "list-ordered",
  },
  comparison: {
    type: "comparison",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Comparison",
    description: "Compare plans, features, or catalog items",
    icon: "columns",
  },
  featureGrid: {
    type: "featureGrid",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Feature Grid",
    description: "Showcase features in a responsive grid with icons and links",
    icon: "layout-grid",
  },
  benefitsGrid: {
    type: "benefitsGrid",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Benefits Grid",
    description: "Customer-focused benefits and value propositions",
    icon: "check-circle",
  },
  trustBadges: {
    type: "trustBadges",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Trust Badges",
    description: "Certifications, guarantees, and trust indicators",
    icon: "shield",
  },
  logoCloud: {
    type: "logoCloud",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Logo Cloud",
    description: "Partner and client logos in grid, carousel, or marquee",
    icon: "building",
  },
  statsCounter: {
    type: "statsCounter",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Statistics Counter",
    description: "Animated metrics with optional charts",
    icon: "bar-chart",
  },
  beforeAfter: {
    type: "beforeAfter",
    version: BLOCK_SYSTEM_VERSION,
    category: "media",
    name: "Image Comparison",
    description:
      "Create interactive before-and-after image comparisons using sliders, split views, overlays, or side-by-side layouts. Ideal for showcasing transformations, upgrades, improvements, and visual differences.",
    icon: "columns",
  },
  videoHero: {
    type: "videoHero",
    version: BLOCK_SYSTEM_VERSION,
    category: "media",
    name: "Video Hero",
    description:
      "A visually engaging hero section featuring background videos or featured media content. Supports autoplay, overlays, custom controls, call-to-action buttons, captions, animations, and responsive video layouts.",
    icon: "video",
  },
  videoGallery: {
    type: "videoGallery",
    version: BLOCK_SYSTEM_VERSION,
    category: "media",
    name: "Video Gallery",
    description:
      "Display collections of videos in organized gallery layouts with support for categories, playlists, thumbnails, filtering, lightbox viewing, embedded platforms, and custom player settings.",
    icon: "gallery-horizontal",
  },
  interactiveHotspots: {
    type: "interactiveHotspots",
    version: BLOCK_SYSTEM_VERSION,
    category: "media",
    name: "Interactive Hotspots",
    description:
      "Add clickable hotspots to images, diagrams, maps, products, or floor plans to reveal additional information, media, links, tooltips, and contextual content through interactive user experiences.",
    icon: "map-pin",
  },
  masonryGallery: {
    type: "masonryGallery",
    version: BLOCK_SYSTEM_VERSION,
    category: "media",
    name: "Masonry Gallery",
    description:
      "Showcase images, videos, and media assets in a dynamic masonry grid layout that efficiently utilizes available space. Supports filtering, lightbox viewing, categories, lazy loading, animations, and responsive display options.",
    icon: "layout-grid",
  },
  productGrid: {
    type: "productGrid",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product Grid",
    description:
      "Display products in a responsive grid layout with support for images, pricing, ratings, stock status, badges, quick actions, filtering, sorting, and pagination. Ideal for category, collection, and search result pages.",
    icon: "layout-grid",
  },
  productCarousel: {
    type: "productCarousel",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product Carousel",
    description:
      "Showcase featured, new, popular, related, or promotional products in an interactive carousel. Supports multiple display styles, autoplay, navigation controls, responsive layouts, and custom product selection rules.",
    icon: "gallery-horizontal",
  },
  productComparison: {
    type: "productComparison",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product Comparison",
    description:
      "Allow customers to compare multiple products side-by-side based on features, specifications, pricing, ratings, availability, and custom attributes. Helps users make informed purchasing decisions.",
    icon: "columns",
  },
  productSpecifications: {
    type: "productSpecifications",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product Specifications",
    description:
      "Present detailed technical specifications, attributes, dimensions, compatibility information, certifications, and product details in a structured and easy-to-read format. Supports tables, grouped sections, and custom fields.",
    icon: "list",
  },
  productReviews: {
    type: "productReviews",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product Reviews",
    description:
      "Display customer ratings, reviews, testimonials, photos, videos, review summaries, and verified purchase indicators. Supports filtering, sorting, review statistics, and moderation controls.",
    icon: "star",
  },
  productFaq: {
    type: "productFaq",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Product FAQ",
    description:
      "Provide answers to common product questions in an organized accordion or expandable layout. Supports categories, searchable content, rich formatting, and dynamic FAQ generation from product data.",
    icon: "help-circle",
  },
  relatedProducts: {
    type: "relatedProducts",
    version: BLOCK_SYSTEM_VERSION,
    category: "commerce",
    name: "Related Products",
    description:
      "Recommend relevant products based on categories, collections, tags, attributes, purchase behavior, manual selection, or custom recommendation rules. Helps increase product discovery and cross-selling opportunities.",
    icon: "link",
  },
  searchBlock: {
    type: "searchBlock",
    version: BLOCK_SYSTEM_VERSION,
    category: "discovery",
    name: "Search Block",
    description:
      "Powerful search with instant results, autocomplete, suggestions, keyword highlighting, and analytics.",
    icon: "search",
  },
  advancedFilters: {
    type: "advancedFilters",
    version: BLOCK_SYSTEM_VERSION,
    category: "discovery",
    name: "Advanced Filters",
    description:
      "Dynamic filters for products, search results, or content collections with real-time URL sync.",
    icon: "filter",
  },
  categoryExplorer: {
    type: "categoryExplorer",
    version: BLOCK_SYSTEM_VERSION,
    category: "discovery",
    name: "Category Explorer",
    description:
      "Browse categories, collections, and taxonomies with tabs, trees, or card grids. Limit items per page with optional pagination.",
    icon: "folder-tree",
  },
  relatedContent: {
    type: "relatedContent",
    version: BLOCK_SYSTEM_VERSION,
    category: "discovery",
    name: "Related Content",
    description:
      "Multi-entity recommendations for products, blog posts, and CMS content by taxonomy or anchor context.",
    icon: "link-2",
  },
  recentlyViewed: {
    type: "recentlyViewed",
    version: BLOCK_SYSTEM_VERSION,
    category: "discovery",
    name: "Recently Viewed",
    description:
      "Show items the visitor recently viewed from session history with customizable layouts.",
    icon: "history",
  },
  stickyCta: {
    type: "stickyCta",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Sticky CTA",
    description:
      "A persistent call-to-action element that remains visible while users scroll. Supports buttons, banners, promotional messages, floating bars, mobile-specific layouts, and trigger-based visibility to maximize conversions.",
    icon: "pin",
  },
  leadForm: {
    type: "leadForm",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Lead Form",
    description:
      "Capture potential customer information through customizable lead generation forms. Supports custom fields, validation, CRM integrations, lead scoring, conditional logic, and conversion tracking.",
    icon: "user-plus",
  },
  contactFormBuilder: {
    type: "contactFormBuilder",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Contact Form Builder",
    description:
      "A flexible drag-and-drop form builder for creating contact, inquiry, support, quote request, and feedback forms. Supports custom fields, file uploads, validation rules, notifications, and third-party integrations.",
    icon: "form-input",
  },
  multiStepForm: {
    type: "multiStepForm",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Multi-Step Form",
    description:
      "Break complex forms into guided steps to improve completion rates and user experience. Supports progress indicators, conditional branching, save-and-resume functionality, and dynamic field visibility.",
    icon: "list-ordered",
  },
  newsletterSignup: {
    type: "newsletterSignup",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Newsletter Signup",
    description:
      "Grow email subscriber lists with customizable newsletter subscription forms. Supports multiple layouts, incentives, audience segmentation, double opt-in, marketing platform integrations, and conversion tracking.",
    icon: "mail-plus",
  },
  downloadGate: {
    type: "downloadGate",
    version: BLOCK_SYSTEM_VERSION,
    category: "conversion",
    name: "Download Gate",
    description:
      "Restrict access to downloadable resources until users complete a desired action such as form submission, newsletter signup, account registration, or content unlock. Supports files, documents, media assets, and lead capture workflows.",
    icon: "lock",
  },
  pricingCalculator: {
    type: "pricingCalculator",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Pricing Calculator",
    description:
      "Allow users to calculate costs, subscriptions, licensing fees, service estimates, or custom pricing based on selected options, quantities, usage, or configurable business rules. Supports dynamic calculations and real-time updates.",
    icon: "calculator",
  },
  knowledgeBase: {
    type: "knowledgeBase",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Knowledge Base",
    description:
      "Organize and present help articles, guides, tutorials, FAQs, and support documentation in a searchable and categorized knowledge center. Supports content hierarchy, filtering, ratings, and multilingual content.",
    icon: "book-open",
  },
  documentationNav: {
    type: "documentationNav",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Documentation Navigation",
    description:
      "Provide structured navigation for documentation portals, developer resources, product manuals, and technical guides. Supports nested sections, breadcrumbs, search integration, version switching, and table-of-contents generation.",
    icon: "file-text",
  },
  statusDashboard: {
    type: "statusDashboard",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Status Dashboard",
    description:
      "Show real-time or manually managed system, service, platform, or infrastructure status information. Supports incident reporting, maintenance notices, uptime metrics, service health indicators, and historical status tracking.",
    icon: "activity",
  },
  teamDirectory: {
    type: "teamDirectory",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Team Directory",
    description:
      "Present employees, departments, leadership teams, contributors, or organizational structures in searchable and filterable directory layouts. Supports profiles, roles, contact information, skills, locations, and team grouping.",
    icon: "users",
  },
  partnerDirectory: {
    type: "partnerDirectory",
    version: BLOCK_SYSTEM_VERSION,
    category: "portal",
    name: "Partner Directory",
    description:
      "Showcase business partners, resellers, distributors, vendors, affiliates, or service providers in a structured directory. Supports categories, locations, certifications, contact details, maps, filtering, and partner profile pages.",
    icon: "handshake",
  },
};

/** Blocks with multi-item layouts that support grid / slider / collapse overflow overrides */
export const CONTENT_OVERFLOW_CAPABLE_TYPES = new Set<BlockType>([
  "testimonials",
  "catalog",
  "contentList",
  "gallery",
  "masonryGallery",
  "faq",
  "pricing",
  "comparison",
  "changelog",
  "timeline",
  "featureGrid",
  "benefitsGrid",
  "trustBadges",
  "logoCloud",
  "statsCounter",
  "videoGallery",
  "productGrid",
  "productCarousel",
  "productComparison",
  "productReviews",
  "productFaq",
  "relatedProducts",
  "categoryExplorer",
  "relatedContent",
  "recentlyViewed",
]);

function def(type: BlockType): BlockDefinition {
  const meta = BASE_META[type];
  return {
    ...meta,
    contentOverflowCapable: CONTENT_OVERFLOW_CAPABLE_TYPES.has(type),
    defaultSettings: BLOCK_DEFAULTS[type] ?? {},
    defaultStyles: {},
    defaultResponsive: {},
    defaultAnimation: { enabled: false },
    translatableFields: BLOCK_TRANSLATABLE_FIELDS[type] ?? [],
    componentKey: type,
  };
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = (
  Object.keys(BASE_META) as BlockType[]
).map(def);

export const BLOCK_DEFINITION_MAP = new Map<BlockType, BlockDefinition>(
  BLOCK_DEFINITIONS.map((d) => [d.type, d])
);
