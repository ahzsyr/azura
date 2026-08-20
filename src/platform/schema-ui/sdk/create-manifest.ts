import type { UIComponentManifest } from "../manifests/types";

export type CreateManifestInput = Omit<UIComponentManifest, "version"> & {
  version?: number;
};

export function createManifest(input: CreateManifestInput): UIComponentManifest {
  return {
    version: 1,
    ...input,
  };
}

export function definePropertyGroup(
  id: string,
  label: string,
  fields: UIComponentManifest["properties"]["groups"][number]["fields"],
) {
  return { id, label, fields };
}

export const GENERAL_PROPERTY_GROUP = definePropertyGroup("general", "General", [
  { key: "label", label: "Label", type: "text", namespace: "presentation" },
  { key: "placeholder", label: "Placeholder", type: "text", namespace: "presentation" },
  { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
]);

export const BEHAVIOR_PROPERTY_GROUP = definePropertyGroup("behavior", "Behavior", [
  { key: "required", label: "Required", type: "boolean", namespace: "behavior" },
  { key: "readOnly", label: "Read only", type: "boolean", namespace: "behavior" },
  { key: "hidden", label: "Hidden", type: "boolean", namespace: "behavior" },
  { key: "disabled", label: "Disabled", type: "boolean", namespace: "behavior" },
]);

export const VALIDATION_PROPERTY_GROUP = definePropertyGroup("validation", "Validation", [
  { key: "min", label: "Min", type: "number", namespace: "data" },
  { key: "max", label: "Max", type: "number", namespace: "data" },
  { key: "pattern", label: "Pattern", type: "text", namespace: "data" },
]);

export function bindingManifest(
  id: string,
  name: string,
  icon: string,
  overrides: Partial<CreateManifestInput> = {},
): UIComponentManifest {
  return createManifest({
    id,
    name,
    icon,
    category: "binding",
    capabilities: {
      supportsValidation: true,
      supportsDataSource: true,
      supportsExpression: true,
      supportsEvents: true,
    },
    node: { defaultProps: {} },
    renderer: {},
    properties: {
      groups: [GENERAL_PROPERTY_GROUP, BEHAVIOR_PROPERTY_GROUP, VALIDATION_PROPERTY_GROUP],
    },
    defaultValue: "",
    ...overrides,
  });
}
