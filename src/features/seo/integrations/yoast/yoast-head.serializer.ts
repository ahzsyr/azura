import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";
import { serializeYoastHtml } from "./yoast-html.serializer";
import { serializeYoastJson } from "./yoast-json.serializer";
import type { YoastHeadResponse } from "./yoast.types";

export function serializeYoastHead(doc: ResolvedSeoDocument): YoastHeadResponse {
  return {
    html: serializeYoastHtml(doc),
    json: serializeYoastJson(doc),
    status: doc.status,
  };
}
