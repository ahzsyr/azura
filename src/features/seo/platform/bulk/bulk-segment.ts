export const BULK_SEGMENT_THRESHOLD = 25;
export const DEFAULT_BULK_SEGMENT_SIZE = 25;

export type BulkSegmentPlanEntry = Readonly<{
  index: number;
  offset: number;
  limit: number;
  label: string;
  rangeLabel: string;
}>;

export type BulkSegmentMeta = Readonly<{
  index: number;
  offset: number;
  limit: number;
  totalItems: number;
  segmentCount: number;
}>;

export function segmentRangeLabel(offset: number, limit: number, totalItems: number): string {
  const start = offset + 1;
  const end = Math.min(offset + limit, totalItems);
  return `items ${start}–${end} of ${totalItems.toLocaleString()}`;
}

export function planBulkSegments(totalItems: number, segmentSize: number): BulkSegmentPlanEntry[] {
  if (totalItems <= 0 || segmentSize <= 0) return [];

  const segmentCount = Math.ceil(totalItems / segmentSize);
  const segments: BulkSegmentPlanEntry[] = [];

  for (let index = 0; index < segmentCount; index++) {
    const offset = index * segmentSize;
    const limit = Math.min(segmentSize, totalItems - offset);
    segments.push(
      Object.freeze({
        index,
        offset,
        limit,
        label: `Segment ${index + 1}`,
        rangeLabel: segmentRangeLabel(offset, limit, totalItems),
      })
    );
  }

  return segments;
}

export function buildSegmentMeta(
  totalItems: number,
  segmentSize: number,
  segmentIndex: number,
  offset: number,
  limit: number
): BulkSegmentMeta {
  return Object.freeze({
    index: segmentIndex,
    offset,
    limit,
    totalItems,
    segmentCount: planBulkSegments(totalItems, segmentSize).length,
  });
}

/** Pure helper for stream pagination — used by engine and tests. */
export function descriptorStreamAction(
  streamIndex: number,
  offset: number,
  limit: number | undefined,
  processedInSegment: number
): "skip" | "process" | "stop" {
  if (streamIndex < offset) return "skip";
  if (limit != null && processedInSegment >= limit) return "stop";
  return "process";
}
