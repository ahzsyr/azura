import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SEO_URL_INSPECTION_NAMESPACE } from "@/features/seo/constants";

export const URL_INSPECTION_PER_RUN = 20;
export const URL_INSPECTION_PER_DAY = 200;
export const URL_INSPECTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const URL_INSPECTION_SPACING_MS = 2000;

export function urlInspectionSpacingMs(): number {
  if (process.env.NODE_ENV === "test") return 0;
  return URL_INSPECTION_SPACING_MS;
}

export type UrlInspectionReason = "publish" | "not_found" | "traffic_drop" | "manual";

type InspectionQueueState = {
  pending: Array<{ url: string; reason: UrlInspectionReason; enqueuedAt: string }>;
  inspected: Record<string, { at: string; reason: string }>;
  daily: { date: string; count: number };
};

const emptyState = (): InspectionQueueState => ({
  pending: [],
  inspected: {},
  daily: { date: utcDate(), count: 0 },
});

function utcDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function loadState(): Promise<InspectionQueueState> {
  try {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_URL_INSPECTION_NAMESPACE, key: "queue" },
      },
    });
    if (!row?.data || typeof row.data !== "object") return emptyState();
    return { ...emptyState(), ...(row.data as InspectionQueueState) };
  } catch {
    return emptyState();
  }
}

async function saveState(state: InspectionQueueState): Promise<void> {
  await prisma.jsonStore.upsert({
    where: { namespace_key: { namespace: SEO_URL_INSPECTION_NAMESPACE, key: "queue" } },
    create: {
      namespace: SEO_URL_INSPECTION_NAMESPACE,
      key: "queue",
      data: state as unknown as Prisma.InputJsonValue,
    },
    update: { data: state as unknown as Prisma.InputJsonValue },
  });
}

export async function enqueueUrlInspection(
  url: string,
  reason: UrlInspectionReason = "publish",
): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
  const state = await loadState();
  if (state.pending.some((item) => item.url === trimmed)) {
    await saveState(state);
    return;
  }
  state.pending.push({ url: trimmed, reason, enqueuedAt: new Date().toISOString() });
  await saveState(state);
}

function remainingDaily(state: InspectionQueueState): number {
  const today = utcDate();
  if (state.daily.date !== today) {
    state.daily = { date: today, count: 0 };
  }
  return Math.max(0, URL_INSPECTION_PER_DAY - state.daily.count);
}

function wasRecentlyInspected(state: InspectionQueueState, url: string, force: boolean): boolean {
  if (force) return false;
  const last = state.inspected[url]?.at;
  if (!last) return false;
  return Date.now() - Date.parse(last) < URL_INSPECTION_TTL_MS;
}

export async function selectDeltaInspectionUrls(candidateUrls: string[] = []): Promise<string[]> {
  const state = await loadState();
  const budget = Math.min(URL_INSPECTION_PER_RUN, remainingDaily(state));
  if (budget <= 0) return [];

  const selected: string[] = [];
  const seen = new Set<string>();

  const consider = (url: string, force: boolean) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (wasRecentlyInspected(state, trimmed, force)) return;
    seen.add(trimmed);
    selected.push(trimmed);
  };

  for (const item of state.pending) {
    consider(item.url, item.reason === "not_found" || item.reason === "traffic_drop");
    if (selected.length >= budget) break;
  }
  if (selected.length < budget) {
    for (const url of candidateUrls) {
      consider(url, false);
      if (selected.length >= budget) break;
    }
  }

  return selected.slice(0, budget);
}

export async function markUrlsInspected(urls: string[], reason: UrlInspectionReason = "traffic_drop") {
  if (urls.length === 0) return;
  const state = await loadState();
  if (state.daily.date !== utcDate()) state.daily = { date: utcDate(), count: 0 };
  const done = new Set(urls);
  for (const url of urls) {
    state.inspected[url] = { at: new Date().toISOString(), reason };
    state.daily.count += 1;
  }
  state.pending = state.pending.filter((item) => !done.has(item.url));
  await saveState(state);
}
