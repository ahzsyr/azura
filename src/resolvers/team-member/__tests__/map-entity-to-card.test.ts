import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityRecord } from "@/features/entities/types";
import { mapTeamMemberEntityToCardViewModel } from "@/resolvers/team-member/map-entity-to-card";
import {
  isTeamMemberPresetId,
  resolveTeamMemberCardTemplateId,
} from "@/templates/preset-template-map";
import { teamDirectoryPropsSchema } from "@/features/builder/blocks/portal/schemas/portal-blocks";
import { getEntityConfigForPreset, getEntityTypesForPreset } from "@/features/translation/entity-registry";

const teamEntity: EntityRecord = {
  ref: { presetId: "team-member", storage: "portal", id: "mem-1", slug: "mem-1" },
  title: "Jane Doe",
  thumbnailUrl: "/jane.jpg",
  fields: {
    teamDirectorySlug: "company",
    departmentId: "dept-1",
    role: "Engineer",
    bio: "Builds things",
    email: "jane@example.com",
    phone: "+1",
    location: "Remote",
    skills: ["TypeScript", "React"],
    imageUrl: "/jane.jpg",
  },
};

const baseCtx = { locale: "en", localePrefix: "en" };

describe("team-member preset-template-map", () => {
  it("identifies team-member preset", () => {
    assert.equal(isTeamMemberPresetId("team-member"), true);
    assert.equal(isTeamMemberPresetId("partner"), false);
  });

  it("resolves member-card template id", () => {
    assert.equal(resolveTeamMemberCardTemplateId(), "member-card");
  });
});

describe("mapTeamMemberEntityToCardViewModel", () => {
  it("builds team member card view model", () => {
    const vm = mapTeamMemberEntityToCardViewModel(
      { entity: teamEntity, teamDirectorySlug: "company" },
      baseCtx,
    );
    assert.equal(vm.templateId, "member-card");
    assert.equal(vm.presetId, "team-member");
    assert.equal(vm.entityId, "mem-1");
    assert.equal(vm.name, "Jane Doe");
    assert.equal(vm.role, "Engineer");
    assert.deepEqual(vm.skills, ["TypeScript", "React"]);
    assert.equal(vm.departmentId, "dept-1");
  });
});

describe("teamDirectoryPropsSchema", () => {
  it("defaults presetId to team-member", () => {
    const parsed = teamDirectoryPropsSchema.parse({});
    assert.equal(parsed.presetId, "team-member");
  });

  it("accepts explicit templateId", () => {
    const parsed = teamDirectoryPropsSchema.parse({
      templateId: "member-card",
      teamDirectorySlug: "company",
    });
    assert.equal(parsed.templateId, "member-card");
  });
});

describe("team-member translation preset aliases", () => {
  it("maps team-member preset to legacy entity types", () => {
    const types = getEntityTypesForPreset("team-member");
    assert.deepEqual(types, ["TeamMember", "TeamDepartment", "TeamDirectory"]);
    const configs = getEntityConfigForPreset("team-member");
    assert.equal(configs.length, 3);
  });
});
