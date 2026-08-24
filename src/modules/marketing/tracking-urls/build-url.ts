export function buildTrackingUrl(input: {
  baseUrl: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}) {
  const url = new URL(input.baseUrl, "https://placeholder.local");
  if (input.utmSource) url.searchParams.set("utm_source", input.utmSource);
  if (input.utmMedium) url.searchParams.set("utm_medium", input.utmMedium);
  if (input.utmCampaign) url.searchParams.set("utm_campaign", input.utmCampaign);
  if (input.utmContent) url.searchParams.set("utm_content", input.utmContent);
  if (input.utmTerm) url.searchParams.set("utm_term", input.utmTerm);

  if (/^https?:\/\//i.test(input.baseUrl)) {
    return url.toString();
  }
  return `${url.pathname}${url.search}`;
}
