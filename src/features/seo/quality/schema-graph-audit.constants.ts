const GOOGLE_RELEVANCE: Record<string, string> = {
  Organization: "Entity / logo / business understanding",
  Corporation: "Entity / logo / business understanding",
  LocalBusiness: "Local / business understanding",
  ElectronicsStore: "Local / business understanding",
  WebSite: "Site name",
  WebPage: "Page understanding",
  BreadcrumbList: "Breadcrumb appearance",
  Product: "Product rich results / Shopping-related understanding",
  Article: "Article appearance",
  FAQPage: "FAQ rich results eligibility",
  ImageObject: "Logo / image signals",
};

export function googleFeatureRelevanceForType(schemaType: string): string {
  return GOOGLE_RELEVANCE[schemaType] ?? "General structured-data signal";
}

export function getGoogleFeatureRelevanceMap(): Readonly<Record<string, string>> {
  return GOOGLE_RELEVANCE;
}
