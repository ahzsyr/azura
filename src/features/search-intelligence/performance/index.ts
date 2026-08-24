export type CwvSample = {
  url: string;
  lcpMs?: number | null;
  cls?: number | null;
  inpMs?: number | null;
  ttfbMs?: number | null;
  capturedAt?: string;
};

export type SeoOutcomeSample = {
  url: string;
  ctr?: number | null;
  averagePosition?: number | null;
  conversions?: number | null;
  impressions?: number | null;
};

export type PerformanceCorrelation = {
  url: string;
  lcpMs: number | null;
  ctr: number | null;
  averagePosition: number | null;
  conversions: number | null;
  risk: "low" | "medium" | "high";
  note: string;
};

export function correlatePerformanceToOutcomes(
  cwv: CwvSample[],
  outcomes: SeoOutcomeSample[],
): PerformanceCorrelation[] {
  const byUrl = new Map(outcomes.map((o) => [o.url, o]));
  return cwv.map((sample) => {
    const outcome = byUrl.get(sample.url);
    const lcp = sample.lcpMs ?? null;
    let risk: PerformanceCorrelation["risk"] = "low";
    let note = "Performance within acceptable range.";
    if (typeof lcp === "number" && lcp > 4000) {
      risk = "high";
      note = "Poor LCP likely suppressing CTR and engagement.";
    } else if (typeof lcp === "number" && lcp > 2500) {
      risk = "medium";
      note = "LCP needs improvement; monitor CTR impact.";
    }
    if (risk !== "low" && (outcome?.ctr ?? 1) < 0.02) {
      note = `${note} CTR is also low (${outcome?.ctr}).`;
    }
    return {
      url: sample.url,
      lcpMs: lcp,
      ctr: outcome?.ctr ?? null,
      averagePosition: outcome?.averagePosition ?? null,
      conversions: outcome?.conversions ?? null,
      risk,
      note,
    };
  });
}

export function listSlowPages(samples: CwvSample[], lcpThreshold = 2500): CwvSample[] {
  return samples.filter((s) => typeof s.lcpMs === "number" && (s.lcpMs as number) > lcpThreshold);
}
