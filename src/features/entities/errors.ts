import type { EntityPresetId } from "@/features/entities/types";

export class UnknownEntityPresetError extends Error {
  readonly presetId: string;

  constructor(presetId: string) {
    super(`Unknown entity preset: ${presetId}`);
    this.name = "UnknownEntityPresetError";
    this.presetId = presetId;
  }
}

export class EntityPresetNotActiveError extends Error {
  readonly presetId: EntityPresetId;

  constructor(presetId: EntityPresetId) {
    super(`Entity preset is not active yet: ${presetId}`);
    this.name = "EntityPresetNotActiveError";
    this.presetId = presetId;
  }
}
