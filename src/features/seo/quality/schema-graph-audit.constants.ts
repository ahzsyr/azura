const GOOGLE_RELEVANCE: Record<string, string> = {
  Organization: "Entity / logo / business understanding",
  Corporation: "Entity / logo / business understanding",
  LocalBusiness: "Local / business understanding",
  ElectronicsStore: "Local / business understanding",
  WholesaleStore: "Local / business understanding",
  ComputerStore: "Local / business understanding",
  ProfessionalService: "Local / business understanding",
  Store: "Local / business understanding",
  Brand: "Brand identity signal",
  WebSite: "Site names / site understanding",
  WebPage: "General semantic context",
  BreadcrumbList: "Breadcrumb appearance",
  Product: "Product rich results / Shopping-related understanding",
  Article: "Article appearance",
  FAQPage: "Schema.org semantic markup (Google FAQ rich result deprecated May 2026)",
  ImageObject: "Logo / image signals",
  VideoObject: "Video discovery",
  Review: "Review snippet (conditional on review source)",
};

export function googleFeatureRelevanceForType(schemaType: string): string {
  return GOOGLE_RELEVANCE[schemaType] ?? "General structured-data signal";
}

export function getGoogleFeatureRelevanceMap(): Readonly<Record<string, string>> {
  return GOOGLE_RELEVANCE;
}
