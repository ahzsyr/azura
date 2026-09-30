export type PageSpeedDataSource = "crux" | "lab_fallback";

export const CRUX_THRESHOLDS = {
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
} as const;

export type CruxMetric = {
  percentile?: number;
  category?: string;
};

export type LoadingExperience = {
  overall_category?: string;
  metrics?: Record<string, CruxMetric>;
};

export function parseCruxFieldMetrics(experience?: LoadingExperience | null): {
  dataSource: PageSpeedDataSource;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  warnings: string[];
} {
  const category = experience?.overall_category?.toUpperCase();
  const metrics = experience?.metrics ?? {};
  const hasField =
    Boolean(experience) && category !== "NONE" && Object.keys(metrics).length > 0;

  if (!hasField) {
    return { dataSource: "lab_fallback", lcpMs: null, inpMs: null, cls: null, warnings: [] };
  }

  const lcpMs = metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null;
  const inpMs =
    metrics.INTERACTION_TO_NEXT_PAINT?.percentile ??
    metrics.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT?.percentile ??
    null;
  const clsRaw = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const cls = typeof clsRaw === "number" ? Number((clsRaw / 100).toFixed(3)) : null;

  const warnings: string[] = [];
  if (lcpMs != null && lcpMs > CRUX_THRESHOLDS.lcpMs) {
    warnings.push(`CrUX LCP ${lcpMs}ms exceeds ${CRUX_THRESHOLDS.lcpMs}ms`);
  }
  if (inpMs != null && inpMs > CRUX_THRESHOLDS.inpMs) {
    warnings.push(`CrUX INP ${inpMs}ms exceeds ${CRUX_THRESHOLDS.inpMs}ms`);
  }
  if (cls != null && cls > CRUX_THRESHOLDS.cls) {
    warnings.push(`CrUX CLS ${cls} exceeds ${CRUX_THRESHOLDS.cls}`);
  }

  return { dataSource: "crux", lcpMs, inpMs, cls, warnings };
}
