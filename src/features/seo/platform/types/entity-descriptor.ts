export type SeoEntityKind =
  | "product"
  | "brand"
  | "collection"
  | "category"
  | "cms_page"
  | "post"
  | "package"
  | "content_item"
  | "static_page"
  | "tag";

export type SeoEntityDescriptor = Readonly<{
  kind: SeoEntityKind;
  id: string;
  locale: string;
  routingKey?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

/** Maps legacy execution context entity types to descriptor kinds. */
export function entityKindFromContext(entityType: string): SeoEntityKind | null {
  const normalized = entityType.toLowerCase().replace(/_/g, "");
  const map: Record<string, SeoEntityKind> = {
    cmspage: "cms_page",
    post: "post",
    product: "product",
    brand: "brand",
    collection: "collection",
    category: "category",
    package: "package",
    contentitem: "content_item",
    staticpage: "static_page",
    site: "static_page",
    tag: "tag",
  };
  return map[normalized] ?? null;
}

export function descriptorFromContext(
  entityType: string,
  entityId: string,
  locale: string,
  metadata?: Record<string, unknown>
): SeoEntityDescriptor {
  const kind = entityKindFromContext(entityType) ?? "cms_page";
  return Object.freeze({
    kind,
    id: entityId,
    locale,
    routingKey: typeof metadata?.routingKey === "string" ? metadata.routingKey : undefined,
    metadata,
  });
}

export function descriptorFromPageKey(pageKey: string, locale: string): SeoEntityDescriptor {
  const [prefix, ...rest] = pageKey.split(":");
  const slug = rest.join(":") || pageKey;
  const kindMap: Record<string, SeoEntityKind> = {
    product: "product",
    brand: "brand",
    collection: "collection",
    category: "category",
    tag: "tag",
  };
  const kind = kindMap[prefix] ?? "static_page";
  return Object.freeze({
    kind,
    id: kind === "static_page" ? pageKey : slug,
    locale,
    routingKey: pageKey,
  });
}
