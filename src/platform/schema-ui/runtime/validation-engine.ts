import type { SchemaDocument } from "../schema/schema-document";
import type { ValueBinding } from "../schema/value-binding";
import { validatorRegistry } from "../registry/validator-registry";

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export class ValidationEngine {
  async validateBinding(
    binding: ValueBinding,
    value: unknown,
    allValues: Record<string, unknown>,
  ): Promise<string | null> {
    for (const ref of binding.validators ?? []) {
      const validator = validatorRegistry.get(ref.validatorId);
      if (!validator) continue;
      const message = await validator.validate(value, ref.config, { binding, allValues });
      if (message) return message;
    }

    if (binding.behavior.required === true) {
      const required = validatorRegistry.get("required");
      if (required) {
        const message = await required.validate(value, undefined, { binding, allValues });
        if (message) return message;
      }
    }

    const min = binding.data.min;
    const max = binding.data.max;
    const pattern = binding.data.pattern;
    if (min != null) {
      const v = validatorRegistry.get("minLength");
      const message = await v?.validate(value, { min }, { binding, allValues });
      if (message) return message;
    }
    if (max != null) {
      const v = validatorRegistry.get("maxLength");
      const message = await v?.validate(value, { max }, { binding, allValues });
      if (message) return message;
    }
    if (pattern) {
      const v = validatorRegistry.get("pattern");
      const message = await v?.validate(value, { pattern: String(pattern) }, { binding, allValues });
      if (message) return message;
    }

    if (binding.componentType === "emailField" && value) {
      const v = validatorRegistry.get("email");
      const message = await v?.validate(value, undefined, { binding, allValues });
      if (message) return message;
    }

    return null;
  }

  async validate(
    document: SchemaDocument,
    values: Record<string, unknown>,
    bindingIds?: string[],
  ): Promise<ValidationResult> {
    const targets = bindingIds
      ? document.bindings.filter((b) => bindingIds.includes(b.bindingId))
      : document.bindings;

    const errors: Record<string, string> = {};
    for (const binding of targets) {
      if (binding.behavior.hidden) continue;
      const message = await this.validateBinding(binding, values[binding.bindingId], values);
      if (message) errors[binding.bindingId] = message;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }
}

export const validationEngine = new ValidationEngine();
