import type { Metadata } from "next";
import { evaluateFacetUrlIndexability } from "./facet-url-indexability";

/**
 * When listing query params are faceted, force noindex and canonical to the clean path.
 * Does not invent ranking signals — only indexability policy.
 */
export function applyFacetIndexPolicyToMetadata(
  metadata: Metadata,
  input: { path: string; searchParams?: URLSearchParams | Record<string, string | string[] | undefined> },
): Metadata {
  const params =
    input.searchParams instanceof URLSearchParams
      ? input.searchParams
      : toSearchParams(input.searchParams);
  const probe = `${input.path}?${params.toString()}`;
  const verdict = evaluateFacetUrlIndexability(params.toString() ? probe : input.path);
  if (!verdict.isFacetFiltered) return metadata;

  const existingCanonical =
    typeof metadata.alternates?.canonical === "string"
      ? metadata.alternates.canonical
      : metadata.alternates?.canonical &&
          typeof metadata.alternates.canonical === "object" &&
          "url" in metadata.alternates.canonical
        ? String((metadata.alternates.canonical as { url?: string }).url ?? "")
        : "";

  let cleanCanonical = existingCanonical;
  if (cleanCanonical) {
    try {
      const u = new URL(cleanCanonical);
      u.search = "";
      cleanCanonical = u.toString();
    } catch {
      cleanCanonical = input.path;
    }
  } else {
    cleanCanonical = input.path;
  }

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: cleanCanonical,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

function toSearchParams(
  raw?: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  if (!raw) return params;
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  return params;
}
