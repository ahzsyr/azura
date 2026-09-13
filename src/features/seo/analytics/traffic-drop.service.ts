export type TrafficDropMetricRow = {
  url: string;
  clicks: number;
  impressions: number;
};

export type TrafficDropCandidate = {
  url: string;
  priorImpressions: number;
  currentImpressions: number;
  dropPercentage: number;
};

const PRIOR_IMPRESSION_FLOOR = 20;
const DROP_THRESHOLD = 0.5;

/** Roll sparse GSC/search-metric rows up to one totals row per URL. */
export function aggregateSearchMetricRowsByUrl(
  rows: Array<{ url: string; clicks?: number; impressions?: number }>,
): TrafficDropMetricRow[] {
  const byUrl = new Map<string, TrafficDropMetricRow>();
  for (const row of rows) {
    const url = row.url?.trim();
    if (!url) continue;
    const current = byUrl.get(url) ?? { url, clicks: 0, impressions: 0 };
    current.clicks += Math.round(row.clicks ?? 0);
    current.impressions += Math.round(row.impressions ?? 0);
    byUrl.set(url, current);
  }
  return [...byUrl.values()];
}

/**
 * Flag URLs with prior impressions ≥ 20 and ≥ 50% drop in impressions
 * or (when prior clicks ≥ 1) ≥ 50% drop in clicks.
 */
export function evaluateTrafficDropCandidates(
  priorWindow: TrafficDropMetricRow[],
  currentWindow: TrafficDropMetricRow[],
): TrafficDropCandidate[] {
  const currentMap = new Map(currentWindow.map((row) => [row.url, row]));
  const candidates: TrafficDropCandidate[] = [];

  for (const prior of priorWindow) {
    const priorImpressions = prior.impressions;
    if (priorImpressions < PRIOR_IMPRESSION_FLOOR) continue;

    const current = currentMap.get(prior.url);
    const currentImpressions = current?.impressions ?? 0;
    const currentClicks = current?.clicks ?? 0;

    const impressionDrop =
      priorImpressions > 0 ? (priorImpressions - currentImpressions) / priorImpressions : 0;
    const clickDrop =
      prior.clicks >= 1 ? (prior.clicks - currentClicks) / prior.clicks : 0;

    if (impressionDrop < DROP_THRESHOLD && clickDrop < DROP_THRESHOLD) continue;

    const drop = Math.max(impressionDrop, clickDrop);
    candidates.push({
      url: prior.url,
      priorImpressions,
      currentImpressions,
      dropPercentage: Math.round(drop * 100),
    });
  }

  return candidates;
}
