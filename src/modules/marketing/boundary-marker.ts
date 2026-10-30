import { retainModuleBoundaryMarker } from "@/modules/module-boundary-marker";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";

/** Phase 6 twin-measure primary marker for Marketing. */
export const MARKETING_BOUNDARY_MARKER = retainModuleBoundaryMarker(MARKETING_MODULE_ID);
