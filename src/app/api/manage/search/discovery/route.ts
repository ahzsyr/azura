import { defineApiRoute } from "@/lib/api-auth";
import { createSearchDiscoveryRoute } from "@/capabilities/search/api/search-discovery-route";

const discoveryHandler = createSearchDiscoveryRoute({
  audience: "admin",
  requireAuth: false,
});

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async () => discoveryHandler(),
});
