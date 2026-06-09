import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/features/collections/types";
import {
  collectionMapFromList,
  resolveCollectionImages,
} from "@/features/collections/collection-navigation";

type Props = {
  collection: Collection;
  allCollections: Collection[];
  locale: string;
  productCount: number;
  subcollectionCount: number;
};

export function CollectionDetailHero({
  collection,
  allCollections,
  locale,
  productCount,
  subcollectionCount,
}: Props) {
  const bySlug = collectionMapFromList(allCollections);
  const media = resolveCollectionImages(collection, bySlug);
  const hasCover = Boolean(media.coverImage?.trim());

  return (
    <header className={`col-banner${hasCover ? "" : " col-banner--no-cover"}`}>
      <div className="col-banner__media" aria-hidden={!hasCover}>
        {hasCover ? (
          <Image
            src={media.coverImage!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="col-banner__img"
          />
        ) : (
          <div className="col-banner__mesh" />
        )}
        <div className="col-banner__veil" />
      </div>
      <div className="col-banner__inner">
        {media.iconImage ? (
          <div className="col-banner__icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.iconImage} alt="" width={56} height={56} />
          </div>
        ) : null}
        <div className="col-banner__text">
          {collection.badge?.trim() ? (
            <p className="col-banner__badge">{collection.badge}</p>
          ) : null}
          <h1 className="col-banner__title">{collection.name}</h1>
          {collection.description?.trim() ? (
            <p className="col-banner__desc">{collection.description}</p>
          ) : null}
          <p className="col-banner__stats">
            <span>
              {productCount} {productCount === 1 ? "product" : "products"}
            </span>
            {subcollectionCount > 0 ? (
              <>
                <span className="col-banner__stats-dot">·</span>
                <span>
                  {subcollectionCount}{" "}
                  {subcollectionCount === 1 ? "subcollection" : "subcollections"}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </header>
  );
}

type SubsProps = {
  subcollections: Collection[];
  allCollections: Collection[];
  locale: string;
};

export function CollectionSubcollectionsGrid({
  subcollections,
  allCollections,
  locale,
}: SubsProps) {
  if (subcollections.length === 0) return null;

  const bySlug = collectionMapFromList(allCollections);

  return (
    <section className="col-subs" aria-labelledby="col-subs-heading">
      <div className="col-subs__head">
        <h2 id="col-subs-heading" className="col-subs__title">
          Browse within this collection
        </h2>
      </div>
      <ul className="col-subs__grid">
        {subcollections.map((sc) => {
          const scMedia = resolveCollectionImages(sc, bySlug);
          const scImage = scMedia.coverImage || scMedia.iconImage;
          return (
            <li key={sc.slug}>
              <Link href={`/${locale}/collections/${sc.slug}`} className="col-subs-card">
                <div className="col-subs-card__media">
                  {scImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scImage} alt="" loading="lazy" />
                  ) : (
                    <span className="col-subs-card__ph" aria-hidden>
                      ◈
                    </span>
                  )}
                </div>
                <div className="col-subs-card__body">
                  {sc.badge ? <span className="col-subs-card__ribbon">{sc.badge}</span> : null}
                  <span className="col-subs-card__name">{sc.name}</span>
                  {sc.description?.trim() ? (
                    <p className="col-subs-card__desc">{sc.description}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
