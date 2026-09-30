import {
  getLengthFieldFeedback,
  type SeoLengthFieldFeedback,
} from "./seo-scoring.service";

export type SeoFieldComputedMetrics = SeoLengthFieldFeedback;

export type SeoFieldState = Readonly<{
  value: string;
  metrics: SeoFieldComputedMetrics;
}>;

export function buildSeoFieldState(
  value: string,
  min: number,
  max: number,
  missingLabel: string,
): SeoFieldState {
  return Object.freeze({
    value,
    metrics: getLengthFieldFeedback(value, min, max, missingLabel),
  });
}
