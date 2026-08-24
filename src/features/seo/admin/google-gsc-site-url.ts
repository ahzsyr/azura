export function normalizeGscSiteUrl(siteUrl: string): string {
  return siteUrl.trim();
}

function gscHostname(siteUrl: string): string | undefined {
  const normalized = normalizeGscSiteUrl(siteUrl);
  if (normalized.startsWith("sc-domain:")) {
    const domain = normalized.slice("sc-domain:".length).trim().toLowerCase();
    return domain || undefined;
  }
  try {
    const withPath = normalized.endsWith("/") ? normalized : `${normalized}/`;
    return new URL(withPath).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function gscRootDomain(siteUrl: string): string | undefined {
  const normalized = normalizeGscSiteUrl(siteUrl);
  if (normalized.startsWith("sc-domain:")) {
    return normalized.slice("sc-domain:".length).trim().toLowerCase() || undefined;
  }
  return gscHostname(siteUrl);
}

function hostnameBelongsToDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  const root = domain.toLowerCase();
  return host === root || host.endsWith(`.${root}`);
}

export function gscSiteUrlsMatch(a: string, b: string): boolean {
  const left = normalizeGscSiteUrl(a);
  const right = normalizeGscSiteUrl(b);
  if (left === right) return true;

  const leftRoot = gscRootDomain(left);
  const rightRoot = gscRootDomain(right);
  const leftIsDomainProperty = left.startsWith("sc-domain:");
  const rightIsDomainProperty = right.startsWith("sc-domain:");

  if (leftIsDomainProperty && rightIsDomainProperty) {
    return Boolean(leftRoot && rightRoot && leftRoot === rightRoot);
  }

  if (leftIsDomainProperty || rightIsDomainProperty) {
    const domain = leftIsDomainProperty ? leftRoot : rightRoot;
    const hostname = leftIsDomainProperty ? gscHostname(right) : gscHostname(left);
    return Boolean(domain && hostname && hostnameBelongsToDomain(hostname, domain));
  }

  const withoutTrailingSlash = (value: string) => value.replace(/\/$/, "") || value;
  return withoutTrailingSlash(left) === withoutTrailingSlash(right);
}

export function resolveGscSiteUrl(configured: string, available: string[]): string | undefined {
  const normalized = normalizeGscSiteUrl(configured);
  if (!normalized) return undefined;

  const matches = available.filter((site) => gscSiteUrlsMatch(site, normalized));
  if (!matches.length) return undefined;

  if (!normalized.startsWith("sc-domain:")) {
    const urlPrefixMatch = matches.find((site) => !site.startsWith("sc-domain:"));
    if (urlPrefixMatch) return urlPrefixMatch;
  }

  return matches[0];
}
