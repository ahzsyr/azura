export type UiMessageKey = {
  namespace: string;
  key: string;
  fullKey: string;
  englishValue: string;
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
      result.push({ namespace, key: fullKey, fullKey, englishValue: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenMessages(v as Record<string, unknown>, fullKey, namespace));
    }
  }

  return result;
}
