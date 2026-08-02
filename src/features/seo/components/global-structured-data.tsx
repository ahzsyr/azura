import { StructuredDataGraph } from "./structured-data-graph";
import type { SeoStructuredConfig } from "@/features/seo/types";

/** @deprecated Use StructuredDataGraph — kept for admin imports. */
export function GlobalStructuredDataSync({
  config: _config,
}: {
  config: SeoStructuredConfig | null;
}) {
  return <StructuredDataGraph />;
}

export async function GlobalStructuredData() {
  return <StructuredDataGraph />;
}
