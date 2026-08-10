export class UnknownTemplateError extends Error {
  constructor(templateId: string) {
    super(`Unknown template: ${templateId}`);
    this.name = "UnknownTemplateError";
  }
}

export class TemplatePresetMismatchError extends Error {
  constructor(templateId: string, presetId: string, expectedPresetId: string) {
    super(
      `Template "${templateId}" does not belong to preset "${presetId}" (expected "${expectedPresetId}")`,
    );
    this.name = "TemplatePresetMismatchError";
  }
}

export class EntityNotFoundError extends Error {
  constructor(presetId: string, entityId: string) {
    super(`Entity not found: ${presetId}/${entityId}`);
    this.name = "EntityNotFoundError";
  }
}

export class TemplateNotActiveError extends Error {
  constructor(templateId: string) {
    super(`Template is not active: ${templateId}`);
    this.name = "TemplateNotActiveError";
  }
}
