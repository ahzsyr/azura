import type { MediaType } from "@prisma/client";

/** Stable string key for mediaTypes arrays — avoids referential churn in picker load effects */
export function mediaTypesToKey(types?: MediaType[]): string {
  return types?.join(",") ?? "";
}

export function parseMediaTypesKey(typesKey: string): MediaType[] | undefined {
  if (!typesKey) return undefined;
  return typesKey.split(",") as MediaType[];
}
