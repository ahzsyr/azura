import { createSearchDiscoveryRoute } from "@/capabilities/search/api/search-discovery-route";

export const GET = createSearchDiscoveryRoute({ audience: "public", requireAuth: false });
