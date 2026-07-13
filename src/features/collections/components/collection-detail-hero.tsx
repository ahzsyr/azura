import Image from "next/image";
import type { Collection } from "@/features/collections/types";
import { isAllowedNextImageSrc, shouldOptimizeNextImage } from "@/lib/config/next-image";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
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
  const coverSrc = media.coverImage?.trim() ?? "";
  const hasCover = Boolean(coverSrc);
  const coverUsesNextImage = hasCover && isAllowedNextImageSrc(coverSrc);

  const imageShared = sharedElementAttrs("collection", collection.slug, "image");
  const titleShared = sharedElementAttrs("collection", collection.slug, "title");

  return (
    <header
      className={`col-banner${hasCover ? "" : " col-banner--no-cover"}`}
      {...(hasCover ? { "data-header-overlay-underlay": "true" } : {})}
    >
      <div
        className={`col-banner__media${hasCover ? "" : ""}`}
        aria-hidden={!hasCover}
        data-shared-element={imageShared["data-shared-element"]}
        data-shared-element-type={imageShared["data-shared-element-type"]}
        data-shared-element-id={imageShared["data-shared-element-id"]}
        style={imageShared.style}
      >
        {hasCover ? (
          coverUsesNextImage ? (
            <Image
              src={coverSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="col-banner__img"
              unoptimized={!shouldOptimizeNextImage(coverSrc)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt="" className="col-banner__img" />
          )
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
          <h1
            className="col-banner__title"
            data-shared-element={titleShared["data-shared-element"]}
            data-shared-element-type={titleShared["data-shared-element-type"]}
            data-shared-element-id={titleShared["data-shared-element-id"]}
            style={titleShared.style}
          >
            {collection.name}
          </h1>
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

