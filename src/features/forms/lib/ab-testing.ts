import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { FormAbTest, FormAbTestVariant } from "@/features/forms/types";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function selectAbVariant(test: FormAbTest, visitorKey: string): FormAbTestVariant | null {
  const variants = test.variants.filter((v) => v.weight > 0);
  if (variants.length === 0) return null;

  const bucket = hashString(`${test.id}:${visitorKey}`) % variants.reduce((sum, v) => sum + v.weight, 0);
  let cursor = 0;
  for (const variant of variants) {
    cursor += variant.weight;
    if (bucket < cursor) return variant;
  }
  return variants[variants.length - 1] ?? null;
}

export function getActiveAbTest(abTests: FormAbTest[] | undefined): FormAbTest | undefined {
  return abTests?.find((test) => test.enabled && test.variants.some((v) => v.weight > 0));
}

export function getAbVisitorKey(storageKey: string): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let key = localStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(storageKey, key);
    }
    return key;
  } catch {
    return "anonymous";
  }
}

export function applySchemaPatch(document: SchemaDocument, patch: Partial<SchemaDocument>): SchemaDocument {
  return {
    ...document,
    nodes: patch.nodes ?? document.nodes,
    bindings: patch.bindings ?? document.bindings,
    steps: patch.steps ?? document.steps,
    rules: patch.rules ?? document.rules,
    theme: patch.theme ? { ...document.theme, ...patch.theme } : document.theme,
    stateMachineId: patch.stateMachineId ?? document.stateMachineId,
    definitionVersion: document.definitionVersion,
  };
}

export function applyAbVariantToRaw(
  raw: Record<string, unknown>,
  variant: FormAbTestVariant,
): Record<string, unknown> {
  if (!variant.schemaPatch) return raw;

  const patch = variant.schemaPatch;
  return {
    ...raw,
    nodes: patch.nodes ?? raw.nodes,
    bindings: patch.bindings ?? raw.bindings,
    steps: patch.steps ?? raw.steps,
    rules: patch.rules ?? raw.rules,
    theme: patch.theme ? { ...(raw.theme as object), ...patch.theme } : raw.theme,
  };
}

export function resolveAbTestedRaw(
  raw: unknown,
  visitorKey: string,
): { raw: unknown; abTestId?: string; abVariantId?: string } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const legacy = obj._legacy as Record<string, unknown> | undefined;
  const abTests = (obj.abTests ?? legacy?.abTests) as FormAbTest[] | undefined;
  const active = getActiveAbTest(abTests);
  if (!active) return { raw };

  const variant = selectAbVariant(active, visitorKey);
  if (!variant) return { raw };

  return {
    raw: applyAbVariantToRaw(obj, variant),
    abTestId: active.id,
    abVariantId: variant.id,
  };
}
