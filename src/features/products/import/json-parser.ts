export function parseJsonProducts(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is Record<string, unknown> => item != null && typeof item === "object");
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.products)) {
      return obj.products.filter(
        (item): item is Record<string, unknown> => item != null && typeof item === "object",
      );
    }
    return [obj];
  }

  return [];
}
