import type { PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import { formsValidationMiddleware } from "./validation-handler";
import { formsScoringMiddleware } from "./scoring-handler";
import { formsSpamMiddleware } from "./spam-handler";
import { formsRoutingMiddleware } from "./routing-handler";
import { formsEmitEventsMiddleware, formsDestinationMiddleware } from "./emit-events-handler";

export { formsValidationMiddleware } from "./validation-handler";
export { formsScoringMiddleware } from "./scoring-handler";
export { formsSpamMiddleware } from "./spam-handler";
export { formsRoutingMiddleware } from "./routing-handler";
export { formsPersistHandler } from "./persist-handler";
export { formsEmitEventsMiddleware, formsDestinationMiddleware } from "./emit-events-handler";

/** Outer middleware runs post-hooks after persist (onion model). */
export const FORMS_SUBMIT_MIDDLEWARE: PipelineMiddleware[] = [
  formsEmitEventsMiddleware,
  formsDestinationMiddleware,
  formsValidationMiddleware,
  formsSpamMiddleware,
  formsScoringMiddleware,
  formsRoutingMiddleware,
];
