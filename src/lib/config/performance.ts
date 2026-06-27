/** ISR / route cache TTLs (seconds). Marketing shell uses tag-only caches via publishShellChange. */
export const REVALIDATE = {
  marketing: 300,
  cms: 60,
  blog: 60,
  packages: 120,
  static: 3600,
} as const;

/** Tag-invalidated shell caches — no TTL expiry. */
export const SHELL_CACHE_REVALIDATE = false as const;

/** next/image sizes hints */
export const IMAGE_SIZES = {
  hero: "100vw",
  card: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  gallery: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  thumbnail: "96px",
  blogFeatured: "(max-width: 896px) 100vw, 896px",
} as const;
