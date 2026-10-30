import { retainModuleBoundaryMarker } from "@/modules/module-boundary-marker";
import { DOCUMENTATION_MODULE_ID } from "@/modules/documentation/manifest";

/** Phase 6 twin-measure primary marker for Documentation. */
export const DOCUMENTATION_BOUNDARY_MARKER = retainModuleBoundaryMarker(DOCUMENTATION_MODULE_ID);
