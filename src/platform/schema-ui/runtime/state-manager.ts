import type { SchemaDocument } from "../schema/schema-document";
import type { ValueBinding } from "../schema/value-binding";

export class StateManager {
  private values: Record<string, unknown> = {};
  private touched = new Set<string>();
  private listeners = new Map<string, Set<(value: unknown) => void>>();

  constructor(initial: Record<string, unknown> = {}) {
    this.values = { ...initial };
  }

  getValue(bindingId: string): unknown {
    return this.values[bindingId];
  }

  setValue(bindingId: string, value: unknown): void {
    this.values[bindingId] = value;
    this.touched.add(bindingId);
    this.listeners.get(bindingId)?.forEach((cb) => cb(value));
  }

  getValues(): Record<string, unknown> {
    return { ...this.values };
  }

  reset(values: Record<string, unknown>): void {
    this.values = { ...values };
    this.touched.clear();
  }

  watch(bindingId: string, callback: (value: unknown) => void): () => void {
    if (!this.listeners.has(bindingId)) this.listeners.set(bindingId, new Set());
    this.listeners.get(bindingId)!.add(callback);
    return () => this.listeners.get(bindingId)?.delete(callback);
  }

  isTouched(bindingId: string): boolean {
    return this.touched.has(bindingId);
  }
}

export function buildInitialValues(document: SchemaDocument): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const binding of document.bindings) {
    values[binding.bindingId] = binding.data.defaultValue ?? "";
  }
  return values;
}

export function applyComputedValues(
  document: SchemaDocument,
  values: Record<string, unknown>,
  evaluate: (expression: string, ctx: Record<string, unknown>) => unknown,
): Record<string, unknown> {
  const next = { ...values };
  for (const binding of document.bindings) {
    if (binding.computed?.expression) {
      next[binding.bindingId] = evaluate(binding.computed.expression, next);
    }
  }
  return next;
}

export function getVisibleBindings(
  document: SchemaDocument,
  values: Record<string, unknown>,
): ValueBinding[] {
  const hidden = new Set<string>();
  for (const rule of document.rules ?? []) {
    const matched = evaluateSimpleRule(rule.expression, values);
    for (const action of rule.actions) {
      if (action.type === "hide" && matched) hidden.add(action.bindingId);
      if (action.type === "show" && !matched) hidden.add(action.bindingId);
    }
  }
  return document.bindings.filter((b) => !hidden.has(b.bindingId) && b.behavior.hidden !== true);
}

function evaluateSimpleRule(expression: string, values: Record<string, unknown>): boolean {
  const trimmed = expression.trim();
  let m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*===\s*"([^"]*)"$/);
  if (m) return String(values[m[1]!] ?? "") === m[2];
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*===\s*'([^']*)'$/);
  if (m) return String(values[m[1]!] ?? "") === m[2];
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*!==\s*"([^"]*)"$/);
  if (m) return String(values[m[1]!] ?? "") !== m[2];
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*!==\s*'([^']*)'$/);
  if (m) return String(values[m[1]!] ?? "") !== m[2];
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s+contains\s+"([^"]*)"$/i);
  if (m) return String(values[m[1]!] ?? "").includes(m[2]!);
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s+contains\s+'([^']*)'$/i);
  if (m) return String(values[m[1]!] ?? "").includes(m[2]!);
  m = trimmed.match(/^([a-zA-Z0-9_-]+)\s+notEmpty$/i);
  if (m) return String(values[m[1]!] ?? "").length > 0;
  return false;
}
