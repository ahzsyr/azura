"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Collection } from "@/features/collections/types";
import {
  collectionMapFromList,
  resolveCollectionImages,
} from "@/features/collections/collection-navigation";
import { IconGrid, IconList } from "@/features/products/components/listing/listing-ui-icons";

type ViewMode = "card" | "list";

type Props = {
  subcollections: Collection[];
  allCollections: Collection[];
};

const CARD_MIN_COL_PX = 220;
const CARD_GAP_PX = 16;
const LIST_ROW_LIMIT = 3;

function getCardColumnCount(width: number): number {
  return Math.max(1, Math.floor((width + CARD_GAP_PX) / (CARD_MIN_COL_PX + CARD_GAP_PX)));
}

function getListColumnCount(width: number): number {
  if (width >= 1100) return 3;
  return 2;
}

function useGridColumnCount(
  ref: React.RefObject<HTMLElement | null>,
  viewMode: ViewMode,
): number {
  const [columnCount, setColumnCount] = useState(viewMode === "list" ? 2 : 1);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    setColumnCount(
      viewMode === "list" ? getListColumnCount(width) : getCardColumnCount(width),
    );
  }, [ref, viewMode]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, ref]);

  return columnCount;
}

type ItemProps = {
  collection: Collection;
  image?: string;
};

function SubcollectionCardItem({ collection, image }: ItemProps) {
  return (
    <Link href={`/collections/${collection.slug}`} className="col-subs-card">
      <div className="col-subs-card__media">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="col-subs-card__ph" aria-hidden>
            ◈
          </span>
        )}
      </div>
      <div className="col-subs-card__body">
        {collection.badge ? (
          <span className="col-subs-card__ribbon">{collection.badge}</span>
        ) : null}
        <span className="col-subs-card__name">{collection.name}</span>
        {collection.description?.trim() ? (
          <p className="col-subs-card__desc">{collection.description}</p>
        ) : null}
      </div>
    </Link>
  );
}

function SubcollectionListItem({ collection, image }: ItemProps) {
  return (
    <Link href={`/collections/${collection.slug}`} className="col-subs-list-item">
      <div className="col-subs-list-item__media">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="col-subs-list-item__ph" aria-hidden>
            ◈
          </span>
        )}
      </div>
      <div className="col-subs-list-item__body">
        {collection.badge ? (
          <span className="col-subs-list-item__ribbon">{collection.badge}</span>
        ) : null}
        <span className="col-subs-list-item__name">{collection.name}</span>
      </div>
    </Link>
  );
}

export function CollectionSubcollectionsBrowser({ subcollections, allCollections }: Props) {
  const router = useRouter();
  const gridRef = useRef<HTMLUListElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [expanded, setExpanded] = useState(false);
  const columnCount = useGridColumnCount(gridRef, viewMode);

  const bySlug = useMemo(() => collectionMapFromList(allCollections), [allCollections]);

  const itemsWithMedia = useMemo(
    () =>
      subcollections.map((sc) => {
        const scMedia = resolveCollectionImages(sc, bySlug);
        return {
          collection: sc,
          image: scMedia.coverImage || scMedia.iconImage,
        };
      }),
    [subcollections, bySlug],
  );

  const visibleLimit = viewMode === "card" ? columnCount : columnCount * LIST_ROW_LIMIT;
  const hasMore = subcollections.length > visibleLimit;
  const visibleItems = expanded ? itemsWithMedia : itemsWithMedia.slice(0, visibleLimit);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setExpanded(false);
  };

  const handleMobileSelect = (slug: string) => {
    if (!slug) return;
    router.push(`/collections/${slug}`);
  };

  if (subcollections.length === 0) return null;

  const gridClassName =
    viewMode === "card"
      ? "col-subs__grid col-subs__grid--card"
      : "col-subs__grid col-subs__grid--list";

  return (
    <section className="col-subs" aria-labelledby="col-subs-heading">
      <div className="col-subs__head">
        <h2 id="col-subs-heading" className="col-subs__title">
          Browse within this collection
        </h2>
        <div
          className="col-subs__view-switcher pl-view-switcher"
          role="group"
          aria-label="Subcollection view mode"
        >
          <button
            type="button"
            className={`pl-view-btn pl-catalog-control${viewMode === "card" ? " pl-view-btn--active" : ""}`}
            onClick={() => handleViewModeChange("card")}
            aria-pressed={viewMode === "card"}
            title="Card view"
          >
            <IconGrid />
          </button>
          <button
            type="button"
            className={`pl-view-btn pl-catalog-control${viewMode === "list" ? " pl-view-btn--active" : ""}`}
            onClick={() => handleViewModeChange("list")}
            aria-pressed={viewMode === "list"}
            title="List view"
          >
            <IconList />
          </button>
        </div>
      </div>

      <div className="col-subs__mobile">
        <label className="col-subs__mobile-label" htmlFor="col-subs-mobile-select">
          Jump to subcollection
        </label>
        <div className="col-subs__mobile-select">
          <select
            id="col-subs-mobile-select"
            className="col-subs__select"
            defaultValue=""
            aria-label="Jump to subcollection"
            onChange={(event) => {
              handleMobileSelect(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              Select a subcollection…
            </option>
            {subcollections.map((sc) => (
              <option key={sc.slug} value={sc.slug}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="col-subs__desktop">
        <ul ref={gridRef} className={gridClassName} id="col-subs-grid">
          {visibleItems.map(({ collection, image }) => (
            <li key={collection.slug}>
              {viewMode === "card" ? (
                <SubcollectionCardItem collection={collection} image={image} />
              ) : (
                <SubcollectionListItem collection={collection} image={image} />
              )}
            </li>
          ))}
        </ul>

        {hasMore ? (
          <div className="col-subs__more-wrap">
            <button
              type="button"
              className="col-subs__more"
              aria-expanded={expanded}
              aria-controls="col-subs-grid"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Show less" : "Browse More"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
