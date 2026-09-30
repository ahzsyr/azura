import type { EntityType, PublicEntityId } from "../types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyEntitySegment(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120) || "unnamed";
}

export function toEntityTypePath(type: EntityType): string {
  return type
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

export function fromEntityTypePath(path: string): EntityType | null {
  const map: Record<string, EntityType> = {
    organization: "Organization",
    brand: "Brand",
    location: "Location",
    department: "Department",
    office: "Office",
    person: "Person",
    role: "Role",
    product: "Product",
    "product-variant": "ProductVariant",
    category: "Category",
    collection: "Collection",
    industry: "Industry",
    solution: "Solution",
    service: "Service",
    "case-study": "CaseStudy",
    project: "Project",
    customer: "Customer",
    supplier: "Supplier",
    article: "Article",
    faq: "FAQ",
    download: "Download",
    video: "Video",
    image: "Image",
    document: "Document",
    event: "Event",
    "job-posting": "JobPosting",
    review: "Review",
    testimonial: "Testimonial",
    "external-profile": "ExternalProfile",
    "web-page": "WebPage",
  };
  return map[path] ?? null;
}

/** Build immutable public entity ID. Never use database IDs. */
export function buildPublicEntityId(type: EntityType, slug: string): PublicEntityId {
  const typePath = toEntityTypePath(type);
  const safeSlug = slugifyEntitySegment(slug);
  if (!SLUG_RE.test(safeSlug)) {
    throw new Error(`Invalid entity slug: ${slug}`);
  }
  return `entity://${typePath}/${safeSlug}`;
}

export function parsePublicEntityId(publicId: string): {
  type: EntityType;
  slug: string;
} | null {
  const match = /^entity:\/\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(publicId);
  if (!match) return null;
  const type = fromEntityTypePath(match[1]);
  if (!type) return null;
  return { type, slug: match[2] };
}

export function isPublicEntityId(value: string): value is PublicEntityId {
  return parsePublicEntityId(value) != null;
}

export function createEntityUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `eg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
