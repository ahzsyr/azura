import type { EntityType, RelationshipType } from "../types";

export const ENTITY_TYPES: readonly EntityType[] = [
  "Organization",
  "Brand",
  "Location",
  "Department",
  "Office",
  "Person",
  "Role",
  "Product",
  "ProductVariant",
  "Category",
  "Collection",
  "Industry",
  "Solution",
  "Service",
  "CaseStudy",
  "Project",
  "Customer",
  "Supplier",
  "Article",
  "FAQ",
  "Download",
  "Video",
  "Image",
  "Document",
  "Event",
  "JobPosting",
  "Review",
  "Testimonial",
  "ExternalProfile",
  "WebPage",
] as const;

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  "HAS_BRAND",
  "HAS_LOCATION",
  "EMPLOYS",
  "OFFERS",
  "OWNS",
  "PUBLISHES",
  "SUPPORTS",
  "SELLS",
  "MANUFACTURES",
  "PARTNERS_WITH",
  "BELONGS_TO_CATEGORY",
  "RELATED_TO",
  "REQUIRES",
  "REPLACES",
  "ACCESSORY_OF",
  "COMPATIBLE_WITH",
  "PART_OF_SOLUTION",
  "MENTIONS",
  "ABOUT",
  "REFERENCES",
  "ANSWERS",
  "PROMOTES",
  "COMPARES",
  "SERVES",
  "LOCATED_IN",
  "PART_OF_REGION",
  "HAS_DEPARTMENT",
  "HAS_OFFICE",
  "HAS_ROLE",
  "HAS_VARIANT",
  "BELONGS_TO_COLLECTION",
  "IN_INDUSTRY",
  "SERVES_CUSTOMER",
  "SUPPLIED_BY",
  "HAS_REVIEW",
  "HAS_TESTIMONIAL",
  "SAME_AS",
  "HAS_MEDIA",
  "DESCRIBES_PAGE",
] as const;

export type RelationshipConstraint = {
  from: EntityType | EntityType[];
  to: EntityType | EntityType[];
  type: RelationshipType;
};

/** Ontology constraints for semantic reasoning and validation. */
export const RELATIONSHIP_ONTOLOGY: readonly RelationshipConstraint[] = [
  { type: "HAS_BRAND", from: "Organization", to: "Brand" },
  { type: "HAS_LOCATION", from: "Organization", to: ["Location", "Office"] },
  { type: "HAS_DEPARTMENT", from: "Organization", to: "Department" },
  { type: "HAS_OFFICE", from: "Organization", to: "Office" },
  { type: "EMPLOYS", from: "Organization", to: "Person" },
  { type: "OFFERS", from: "Organization", to: ["Product", "Service", "Solution"] },
  { type: "SELLS", from: "Organization", to: ["Product", "ProductVariant"] },
  { type: "MANUFACTURES", from: ["Organization", "Brand"], to: "Product" },
  { type: "PARTNERS_WITH", from: "Organization", to: ["Organization", "Supplier", "Customer"] },
  { type: "PUBLISHES", from: "Organization", to: ["Article", "FAQ", "Download", "Video", "Document"] },
  { type: "SUPPORTS", from: "Organization", to: ["Product", "Service"] },
  { type: "OWNS", from: "Organization", to: ["Brand", "WebPage"] },
  { type: "BELONGS_TO_CATEGORY", from: ["Product", "ProductVariant", "Article"], to: "Category" },
  { type: "BELONGS_TO_COLLECTION", from: ["Product", "Article"], to: "Collection" },
  { type: "HAS_VARIANT", from: "Product", to: "ProductVariant" },
  { type: "RELATED_TO", from: ["Product", "Article", "Solution"], to: ["Product", "Article", "Solution"] },
  { type: "REQUIRES", from: "Product", to: ["Product", "ProductVariant"] },
  { type: "REPLACES", from: "Product", to: "Product" },
  { type: "ACCESSORY_OF", from: "Product", to: "Product" },
  { type: "COMPATIBLE_WITH", from: "Product", to: "Product" },
  { type: "PART_OF_SOLUTION", from: ["Product", "Service"], to: "Solution" },
  { type: "IN_INDUSTRY", from: ["Organization", "Product", "Solution"], to: "Industry" },
  { type: "MENTIONS", from: ["Article", "FAQ", "CaseStudy"], to: ["Product", "Brand", "Solution", "Category"] },
  { type: "ABOUT", from: ["Article", "FAQ", "CaseStudy"], to: ["Product", "Industry", "Solution"] },
  { type: "REFERENCES", from: "Article", to: ["Article", "Document", "Download"] },
  { type: "ANSWERS", from: "FAQ", to: ["Product", "Service", "Solution"] },
  { type: "PROMOTES", from: "Article", to: ["Product", "Service"] },
  { type: "COMPARES", from: "Article", to: "Product" },
  { type: "SERVES", from: ["Location", "Office"], to: ["Industry", "Customer"] },
  { type: "LOCATED_IN", from: ["Office", "Location", "Person"], to: "Location" },
  { type: "PART_OF_REGION", from: "Location", to: "Location" },
  { type: "HAS_ROLE", from: "Person", to: "Role" },
  { type: "SERVES_CUSTOMER", from: "Organization", to: "Customer" },
  { type: "SUPPLIED_BY", from: ["Product", "Organization"], to: "Supplier" },
  { type: "HAS_REVIEW", from: ["Organization", "Product"], to: "Review" },
  { type: "HAS_TESTIMONIAL", from: "Organization", to: "Testimonial" },
  { type: "SAME_AS", from: ["Organization", "Person", "Brand"], to: "ExternalProfile" },
  { type: "HAS_MEDIA", from: ["Organization", "Product", "Article"], to: ["Image", "Video", "Document", "Download"] },
  { type: "DESCRIBES_PAGE", from: ["Product", "Article", "FAQ", "Organization"], to: "WebPage" },
];

export function isRelationshipAllowed(
  type: RelationshipType,
  from: EntityType,
  to: EntityType,
): boolean {
  const rules = RELATIONSHIP_ONTOLOGY.filter((r) => r.type === type);
  if (rules.length === 0) return true;
  return rules.some((rule) => {
    const fromOk = Array.isArray(rule.from) ? rule.from.includes(from) : rule.from === from;
    const toOk = Array.isArray(rule.to) ? rule.to.includes(to) : rule.to === to;
    return fromOk && toOk;
  });
}

/** Default property keys expected for Organization completeness scoring. */
export const ORGANIZATION_CORE_PROPERTIES = [
  "name",
  "legalName",
  "description",
  "logo",
  "phone",
  "email",
  "address",
  "geo",
  "sameAs",
] as const;
