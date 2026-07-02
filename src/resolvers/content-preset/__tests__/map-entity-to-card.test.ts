import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityRecord } from "@/features/entities/types";
import { mapEntityToCardViewModel } from "@/resolvers/content-preset/map-entity-to-card";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import {
  resolveCardTemplateId,
  resolveDetailTemplateId,
  resolvePresetFromContentTypeSlug,
  resolvePresetFromBlockProps,
} from "@/templates/preset-template-map";

const destinationEntity: EntityRecord = {
  ref: { presetId: "destination", storage: "content_item", id: "dest-1", slug: "umrah-package" },
  title: "Umrah Package",
  excerpt: "7 nights in Makkah",
  thumbnailUrl: "https://cdn.example/umrah.jpg",
  isFeatured: true,
  fields: {
    price: 1200,
    currency: "USD",
    duration: 7,
  },
};

const propertyEntity: EntityRecord = {
  ref: { presetId: "property", storage: "content_item", id: "prop-1", slug: "grand-hotel" },
  title: "Grand Hotel",
  excerpt: "City center",
  fields: { city: "Dubai", stars: 5 },
};

const serviceEntity: EntityRecord = {
  ref: { presetId: "service", storage: "content_item", id: "svc-1", slug: "airport-transfer" },
  title: "Airport Transfer",
  excerpt: "Private shuttle",
  fields: { icon: "car", ctaHref: "/contact" },
};

const baseCtx = {
  locale: "en",
  localePrefix: "en",
  displaySettings: mergeDisplaySettings({ showPrice: true, showDuration: true }),
};

describe("preset-template-map", () => {
  it("maps content type slugs to presets", () => {
    assert.equal(resolvePresetFromContentTypeSlug("catalog-items"), "destination");
    assert.equal(resolvePresetFromContentTypeSlug("offerings"), "service");
    assert.equal(resolvePresetFromContentTypeSlug("listings"), "property");
  });

  it("resolves card and detail template ids", () => {
    assert.equal(resolveCardTemplateId("destination"), "destination-card");
    assert.equal(resolveDetailTemplateId("service"), "service-detail");
  });

  it("derives preset from block props", () => {
    assert.equal(
      resolvePresetFromBlockProps({ contentTypeSlug: "listings" }),
      "property",
    );
    assert.equal(resolvePresetFromBlockProps({ presetId: "service" }), "service");
  });
});

describe("mapEntityToCardViewModel", () => {
  it("builds destination card view model", () => {
    const vm = mapEntityToCardViewModel(
      { entity: destinationEntity, presetId: "destination", contentTypeSlug: "catalog-items" },
      baseCtx,
    );
    assert.equal(vm.templateId, "destination-card");
    assert.equal(vm.price, 1200);
    assert.equal(vm.duration, 7);
    assert.equal(vm.currency, "USD");
    assert.notEqual(vm.href, "#");
  });

  it("builds property card view model", () => {
    const vm = mapEntityToCardViewModel(
      { entity: propertyEntity, presetId: "property", contentTypeSlug: "listings" },
      baseCtx,
    );
    assert.equal(vm.templateId, "property-card");
    assert.equal(vm.city, "Dubai");
    assert.equal(vm.stars, 5);
  });

  it("builds service card view model", () => {
    const vm = mapEntityToCardViewModel(
      { entity: serviceEntity, presetId: "service", contentTypeSlug: "offerings" },
      baseCtx,
    );
    assert.equal(vm.templateId, "service-card");
    assert.equal(vm.icon, "car");
    assert.equal(vm.ctaHref, "/contact");
  });
});
