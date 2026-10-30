import { retainModuleBoundaryMarker } from "@/modules/module-boundary-marker";
import { STATUS_PAGE_MODULE_ID } from "@/modules/status-page/manifest";

/** Phase 6 twin-measure primary marker for Status Page. */
export const STATUS_PAGE_BOUNDARY_MARKER = retainModuleBoundaryMarker(STATUS_PAGE_MODULE_ID);
