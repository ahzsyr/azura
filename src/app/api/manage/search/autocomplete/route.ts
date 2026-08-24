import { defineApiRoute } from "@/lib/api-auth";
import { createSearchAutocompleteRoute } from "@/capabilities/search/api/search-autocomplete-route";

const autocompleteHandler = createSearchAutocompleteRoute({
  requireAuth: false,
  includeAdmin: true,
});

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => autocompleteHandler(request),
});
