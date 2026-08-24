export type ValidatorRef = {
  validatorId: string;
  config?: Record<string, unknown>;
};

export type ValueBinding = {
  bindingId: string;
  componentType: string;
  version: number;
  presentation: Record<string, unknown>;
  behavior: Record<string, unknown>;
  data: Record<string, unknown>;
  validators?: ValidatorRef[];
  computed?: { expression: string };
};

export function newBindingId(prefix = "binding"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getBindingLabel(binding: ValueBinding): string {
  return String(binding.presentation.label ?? binding.bindingId);
}

export function isBindingRequired(binding: ValueBinding): boolean {
  return binding.behavior.required === true;
}
