import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityRecord } from "@/features/entities/types";
import { mapPartnerEntityToCardViewModel } from "@/resolvers/partner/map-entity-to-card";
import {
  isPartnerPresetId,
  resolvePartnerCardTemplateId,
} from "@/templates/preset-template-map";
import { partnerDirectoryPropsSchema } from "@/features/builder/blocks/portal/schemas/portal-blocks";
import { getEntityConfigForPreset, getEntityTypesForPreset } from "@/features/translation/entity-registry";

const partnerEntity: EntityRecord = {
  ref: { presetId: "partner", storage: "portal", id: "prt-1", slug: "prt-1" },
  title: "Acme Corp",
  thumbnailUrl: "/acme.png",
  collectionSlug: "gold",
  fields: {
    partnerProgramSlug: "alliances",
    description: "Enterprise partner",
    location: "Dubai",
    logoUrl: "/acme.png",
    websiteUrl: "https://acme.example",
    profileUrl: "",
    email: "hello@acme.example",
    phone: "",
    categorySlug: "gold",
    certifications: ["ISO"],
  },
};

const baseCtx = { locale: "en", localePrefix: "en" };

describe("partner preset-template-map", () => {
  it("identifies partner preset", () => {
    assert.equal(isPartnerPresetId("partner"), true);
    assert.equal(isPartnerPresetId("team-member"), false);
  });

  it("resolves partner-card template id", () => {
    assert.equal(resolvePartnerCardTemplateId(), "partner-card");
  });
});

describe("mapPartnerEntityToCardViewModel", () => {
  it("builds partner card view model", () => {
    const vm = mapPartnerEntityToCardViewModel(
      { entity: partnerEntity, partnerProgramSlug: "alliances" },
      baseCtx,
    );
    assert.equal(vm.templateId, "partner-card");
    assert.equal(vm.presetId, "partner");
    assert.equal(vm.entityId, "prt-1");
    assert.equal(vm.name, "Acme Corp");
    assert.equal(vm.websiteUrl, "https://acme.example");
    assert.equal(vm.categorySlug, "gold");
    assert.deepEqual(vm.certifications, ["ISO"]);
  });
});

describe("partnerDirectoryPropsSchema", () => {
  it("defaults presetId to partner", () => {
    const parsed = partnerDirectoryPropsSchema.parse({});
    assert.equal(parsed.presetId, "partner");
  });

  it("accepts explicit templateId", () => {
    const parsed = partnerDirectoryPropsSchema.parse({
      templateId: "partner-card",
      partnerProgramSlug: "alliances",
    });
    assert.equal(parsed.templateId, "partner-card");
  });
});

describe("partner translation preset aliases", () => {
  it("maps partner preset to legacy entity types", () => {
    const types = getEntityTypesForPreset("partner");
    assert.deepEqual(types, ["Partner", "PartnerCategory", "PartnerProgram"]);
    const configs = getEntityConfigForPreset("partner");
    assert.equal(configs.length, 3);
  });
});
