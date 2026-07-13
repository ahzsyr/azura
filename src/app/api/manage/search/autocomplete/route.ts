import { createSearchAutocompleteRoute } from "@/capabilities/search/api/search-autocomplete-route";

export const GET = createSearchAutocompleteRoute({ requireAuth: true, includeAdmin: true });
