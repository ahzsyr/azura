import type { SavePipelineEntityType } from "./metrics";

export type ExecutionStrictness = "strict" | "conditional" | "flexible";

export type ExecutionProfile = {
  revision: ExecutionStrictness;
  seo: ExecutionStrictness;
  search: ExecutionStrictness;
  revalidation: ExecutionStrictness;
  arrayStrategy: Record<string, "replace" | "merge" | "diff">;
};

export const executionPlanRegistry: Record<SavePipelineEntityType, ExecutionProfile> = {
  CMS_PAGE: {
    revision: "strict",
    seo: "strict",
    search: "strict",
    revalidation: "strict",
    arrayStrategy: {
      blocks: "replace",
    },
  },
  CONTENT_ITEM: {
    revision: "flexible",
    seo: "conditional",
    search: "strict",
    revalidation: "conditional",
    arrayStrategy: {
      blocks: "replace",
      media: "replace",
    },
  },
  POST: {
    revision: "strict",
    seo: "strict",
    search: "strict",
    revalidation: "strict",
    arrayStrategy: {
      blocks: "replace",
      categoryIds: "replace",
      tagIds: "replace",
      relatedPostIds: "replace",
    },
  },
};

export function getExecutionProfile(entityType: SavePipelineEntityType): ExecutionProfile {
  return executionPlanRegistry[entityType];
}
