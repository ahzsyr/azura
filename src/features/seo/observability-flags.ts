function enabled(name: string) {
  return process.env[name]?.toLowerCase() !== "false";
}

export const seoObservabilityFlags = {
  seoTelemetry: enabled("SEO_TELEMETRY_ENABLED"),
  seoHealthScore: enabled("SEO_HEALTH_SCORE_ENABLED"),
  seoAnalyticsIngestion: enabled("SEO_ANALYTICS_INGESTION_ENABLED"),
  seoRichResults: enabled("SEO_RICH_RESULTS_ENABLED"),
};
