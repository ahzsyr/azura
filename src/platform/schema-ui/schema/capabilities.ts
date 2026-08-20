export type ComponentCapabilities = {
  supportsValidation?: boolean;
  supportsDataSource?: boolean;
  supportsExpression?: boolean;
  supportsComputedValue?: boolean;
  supportsChildren?: boolean;
  supportsLayout?: boolean;
  supportsEvents?: boolean;
  supportsToolbarActions?: boolean;
};

export const DEFAULT_BINDING_CAPABILITIES: ComponentCapabilities = {
  supportsValidation: true,
  supportsDataSource: true,
  supportsExpression: true,
  supportsComputedValue: true,
  supportsChildren: false,
  supportsLayout: false,
  supportsEvents: true,
  supportsToolbarActions: false,
};

export const DEFAULT_LAYOUT_CAPABILITIES: ComponentCapabilities = {
  supportsValidation: false,
  supportsDataSource: false,
  supportsExpression: false,
  supportsComputedValue: false,
  supportsChildren: true,
  supportsLayout: true,
  supportsEvents: false,
  supportsToolbarActions: true,
};

export const DEFAULT_CONTENT_CAPABILITIES: ComponentCapabilities = {
  supportsValidation: false,
  supportsDataSource: false,
  supportsExpression: false,
  supportsComputedValue: false,
  supportsChildren: false,
  supportsLayout: false,
  supportsEvents: false,
  supportsToolbarActions: false,
};

export function hasCapability(
  capabilities: ComponentCapabilities | undefined,
  key: keyof ComponentCapabilities,
): boolean {
  return capabilities?.[key] === true;
}
