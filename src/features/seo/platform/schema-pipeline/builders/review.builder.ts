import type { SchemaContext } from "../types";

/** Testimonials reviews are merged into OrganizationBuilder. */
export const ReviewBuilder = {
  id: "review",
  version: 1,
  supports(_ctx: SchemaContext): boolean {
    return false;
  },
  build(_ctx: SchemaContext) {
    return [];
  },
};
