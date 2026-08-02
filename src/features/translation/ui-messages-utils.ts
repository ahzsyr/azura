import { getMessageGroup, inferMessageRole, type MessageSemanticRole } from "./ui-message-meta";

export type UiMessageKey = {
  namespace: string;
  key: string;
  fullKey: string;
  englishValue: string;
  group: string;
  role: MessageSemanticRole;
};

export function flattenMessages(
  obj: Record<string, unknown>,
  prefix = "",
  namespace = "root",
): UiMessageKey[] {
  const result: UiMessageKey[] = [];

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result.push(enrichMessageKey({ namespace, key: fullKey, fullKey, englishValue: v }));
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenMessages(v as Record<string, unknown>, fullKey, namespace));
    }
  }

  return result;
}

export function enrichMessageKey(
  key: Pick<UiMessageKey, "namespace" | "key" | "fullKey" | "englishValue">,
): UiMessageKey {
  return {
    ...key,
    group: getMessageGroup(key.fullKey),
    role: inferMessageRole(key.fullKey),
  };
}

export function enrichMessageKeys(
  keys: Pick<UiMessageKey, "namespace" | "key" | "fullKey" | "englishValue">[],
): UiMessageKey[] {
  return keys.map(enrichMessageKey);
}
