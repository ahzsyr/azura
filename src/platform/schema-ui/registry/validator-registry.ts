import type { ValidatorDefinition } from "../manifests/types";

class ValidatorRegistry {
  private readonly entries = new Map<string, ValidatorDefinition>();

  register(def: ValidatorDefinition): void {
    this.entries.set(def.id, def);
  }

  get(id: string): ValidatorDefinition | undefined {
    return this.entries.get(id);
  }

  getOrThrow(id: string): ValidatorDefinition {
    const entry = this.get(id);
    if (!entry) throw new Error(`Unknown validator: ${id}`);
    return entry;
  }

  list(): ValidatorDefinition[] {
    return [...this.entries.values()];
  }
}

export const validatorRegistry = new ValidatorRegistry();

export const requiredValidator: ValidatorDefinition = {
  id: "required",
  name: "Required",
  validate(value) {
    if (value == null || value === "" || value === false) return "Required";
    return null;
  },
};

export const emailValidator: ValidatorDefinition = {
  id: "email",
  name: "Email",
  validate(value) {
    if (value == null || value === "") return null;
    const str = String(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return "Invalid email";
    return null;
  },
};

export const minLengthValidator: ValidatorDefinition = {
  id: "minLength",
  name: "Min length",
  validate(value, config) {
    if (value == null || value === "") return null;
    const min = Number(config?.min ?? 0);
    if (String(value).length < min) return `Minimum length is ${min}`;
    return null;
  },
};

export const maxLengthValidator: ValidatorDefinition = {
  id: "maxLength",
  name: "Max length",
  validate(value, config) {
    if (value == null || value === "") return null;
    const max = Number(config?.max ?? Infinity);
    if (String(value).length > max) return `Maximum length is ${max}`;
    return null;
  },
};

export const patternValidator: ValidatorDefinition = {
  id: "pattern",
  name: "Pattern",
  validate(value, config) {
    if (value == null || value === "") return null;
    const pattern = String(config?.pattern ?? "");
    if (!pattern) return null;
    if (!new RegExp(pattern).test(String(value))) return "Invalid format";
    return null;
  },
};

export function registerBuiltinValidators(): void {
  for (const v of [requiredValidator, emailValidator, minLengthValidator, maxLengthValidator, patternValidator]) {
    validatorRegistry.register(v);
  }
}
