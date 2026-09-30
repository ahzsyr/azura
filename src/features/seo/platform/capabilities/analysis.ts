import { buildContentSnapshot } from "../layers/content/content-engine";
import type { ContentSnapshot, SeoExecutionContext } from "../types";

export async function runAnalysis(ctx: SeoExecutionContext): Promise<ContentSnapshot> {
  return buildContentSnapshot(ctx);
}
