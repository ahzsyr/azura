import { createSearchDiscoveryRoute } from "@/capabilities/search/api/search-discovery-route";

export const GET = createSearchDiscoveryRoute({ audience: "admin", requireAuth: true });
