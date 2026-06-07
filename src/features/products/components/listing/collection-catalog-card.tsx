import Link from "next/link";
import type { ProductListingRecord } from "@/features/products/listing/types";

type Props = {
  collection: ProductListingRecord;
  href: string;
  viewLabel?: string;
};

export function CollectionCatalogCard({
  collection,
  href,
  viewLabel = "View",
}: Props) {
  const itemCount = collection.reviews_count ?? 0;
  const parentLabel = collection.category?.trim();
  const bannerSrc =
    collection.primary_image?.trim() || collection.secondary_image?.trim() || undefined;

  return (
    <article className="cl-catalog-card">
      <Link href={href} className="cl-catalog-card__link" aria-label={`${collection.name} — ${viewLabel}`}>
        <div
          className={
            bannerSrc
              ? "cl-catalog-card__media cl-catalog-card__media--has-image"
              : "cl-catalog-card__media"
          }
        >
          {bannerSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="cl-catalog-card__img pl-card__media-img"
              src={bannerSrc}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="cl-catalog-card__placeholder" aria-hidden="true" />
          )}
          <span className="cl-catalog-card__media-shade" aria-hidden="true" />
          {collection.brand ? (
            <span className="cl-catalog-card__badge">{collection.brand}</span>
          ) : null}
        </div>
        <div className="cl-catalog-card__body">
          {parentLabel ? <span className="cl-catalog-card__parent">{parentLabel}</span> : null}
          <h3 className="cl-catalog-card__title">{collection.name}</h3>
          {collection.short_description ? (
            <p className="cl-catalog-card__desc">{collection.short_description}</p>
          ) : (
            <p className="cl-catalog-card__desc cl-catalog-card__desc--empty">&nbsp;</p>
          )}
          <footer className="cl-catalog-card__foot">
            <span className="cl-catalog-card__meta">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="cl-catalog-card__cta">
              {viewLabel}
              <span className="cl-catalog-card__cta-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </footer>
        </div>
      </Link>
    </article>
  );
}
