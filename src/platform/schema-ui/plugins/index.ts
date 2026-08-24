import type { UIComponentManifest } from "../manifests/types";
import { ratingFieldPlugin } from "./rating-field.plugin";
import { npsFieldPlugin } from "./nps-field.plugin";
import {
  surveyLikertManifest,
  surveyEmojiManifest,
  surveyYesNoManifest,
  surveyMatrixManifest,
} from "./survey-fields.plugin";

/**
 * Plugin manifests — add new plugins here or register at runtime via discoverManifests().
 * Import each manifest individually (do not spread arrays from "use client" modules —
 * client-boundary proxies are not iterable during server module evaluation).
 */
export const PLUGIN_MANIFESTS: UIComponentManifest[] = [
  ratingFieldPlugin,
  npsFieldPlugin,
  surveyLikertManifest,
  surveyEmojiManifest,
  surveyYesNoManifest,
  surveyMatrixManifest,
];
