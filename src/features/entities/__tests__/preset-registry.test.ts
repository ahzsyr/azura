import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ContentItemView } from "@/features/content/content-public.types";
import type { ContentListItem } from "@/features/content/types";
import {
  mapContentItemViewToEntityRecord,
  mapContentListItemToEntityListRow,
  mapProductSummaryToEntityListRow,
  mapProductToEntityRecord,
} from "@/features/entities/adapters/normalize";
import {
  getEntityTypeDefinition,
  listEntityTypeDefinitions,
  resolvePresetByContentTypeSlug,
  resolvePresetByLegacySource,
} from "@/features/entities/preset-registry";

describe("preset-registry", () => {
  it("maps content type slugs to preset ids", () => {
    assert.equal(resolvePresetByContentTypeSlug("products"), "product");
    assert.equal(resolvePresetByContentTypeSlug("offerings"), "service");
    assert.equal(resolvePresetByContentTypeSlug("catalog-items"), "destination");
    assert.equal(resolvePresetByContentTypeSlug("listings"), "property");
    assert.equal(resolvePresetByContentTypeSlug("unknown"), null);
  });

  it("maps legacy catalog sources to preset ids", () => {
    assert.equal(resolvePresetByLegacySource("packages"), "destination");
    assert.equal(resolvePresetByLegacySource("hotels"), "property");
    assert.equal(resolvePresetByLegacySource("services"), "service");
  });

  it("returns eight active presets by default", () => {
    const active = listEntityTypeDefinitions();
    assert.equal(active.length, 8);
    assert.deepEqual(
      active.map((def) => def.presetId).sort(),
      [
        "destination",
        "knowledge",
        "partner",
        "pricing",
        "product",
        "property",
        "service",
        "team-member",
      ],
    );
  });

  it("excludes planned presets unless includePlanned is true", () => {
    const all = listEntityTypeDefinitions({ includePlanned: true });
    assert.ok(all.length > 8);
    const project = getEntityTypeDefinition("project");
    assert.ok(project);
    assert.equal(project?.status, "planned");
    assert.equal(project?.storage, "portal");
  });

  it("maps active presets to correct storage backends", () => {
    assert.equal(getEntityTypeDefinition("product")?.storage, "product");
    assert.equal(getEntityTypeDefinition("product")?.contentTypeSlug, "products");
    assert.equal(getEntityTypeDefinition("product")?.migrationPhase, "dual");
    assert.equal(getEntityTypeDefinition("service")?.contentTypeSlug, "offerings");
    assert.equal(getEntityTypeDefinition("destination")?.contentTypeSlug, "catalog-items");
    assert.equal(getEntityTypeDefinition("property")?.contentTypeSlug, "listings");
  });
});

describe("entity normalization", () => {
  it("maps ContentListItem to EntityListRow", () => {
    const item: ContentListItem = {
      id: "item-1",
      titleEn: "Airport Pickup",
      titleAr: "استقبال",
      status: "PUBLISHED",
      isVisible: true,
      isFeatured: false,
      sortOrder: 0,
      slug: "airport-pickup",
      editHref: "/admin/content/offerings/item-1",
    };

    const row = mapContentListItemToEntityListRow("service", item);
    assert.equal(row.ref.presetId, "service");
    assert.equal(row.ref.storage, "content_item");
    assert.equal(row.ref.slug, "airport-pickup");
    assert.equal(row.title, "Airport Pickup");
  });

  it("maps ContentItemView to EntityRecord", () => {
    const view: ContentItemView = {
      id: "item-2",
      contentTypeSlug: "offerings",
      routePrefix: "services",
      slug: "vip-transfer",
      title: "VIP Transfer",
      excerpt: "Fast lane",
      description: "Full description",
      titleEn: "VIP Transfer",
      titleAr: "نقل VIP",
      excerptEn: "Fast lane",
      excerptAr: "",
      descriptionEn: "Full description",
      descriptionAr: "",
      attributes: { offeringType: "TRANSPORT" },
      blocks: [],
      displaySettings: {},
      status: "PUBLISHED",
      isFeatured: true,
      isVisible: true,
      sortOrder: 1,
      collection: { id: "col-1", slug: "transport", name: "Transport", nameEn: "Transport", nameAr: "" },
      media: [{ id: "m1", url: "/img.jpg", alt: "", caption: "", altEn: "", altAr: "", captionEn: "", captionAr: "", sortOrder: 0, isCover: true }],
      href: "/services/vip-transfer",
    };

    const record = mapContentItemViewToEntityRecord("service", view);
    assert.equal(record.ref.slug, "vip-transfer");
    assert.equal(record.fields.offeringType, "TRANSPORT");
    assert.equal(record.collectionSlug, "transport");
    assert.equal(record.href, "/services/vip-transfer");
  });

  it("maps ProductSummary to EntityListRow", () => {
    const row = mapProductSummaryToEntityListRow("product", {
      id: "p-1",
      slug: "widget",
      name: "Widget Pro",
      price: { value: 99, currency: "USD" },
      primary_image: "/widget.jpg",
    });
    assert.equal(row.ref.storage, "product");
    assert.equal(row.title, "Widget Pro");
    assert.equal(row.thumbnailUrl, "/widget.jpg");
  });

  it("maps Product to EntityRecord", () => {
    const record = mapProductToEntityRecord(
      "product",
      {
        id: "p-2",
        productTitle: "Gadget",
        price: { value: 49, currency: "USD" },
        media: { images: [{ url: "/gadget.jpg" }] },
        reviews: { rating: 4.5, count: 10 },
        brand: "Acme",
      },
      "gadget",
    );
    assert.equal(record.ref.slug, "gadget");
    assert.equal(record.fields.brand, "Acme");
    assert.equal(record.thumbnailUrl, "/gadget.jpg");
  });
});
