"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkAutoFillAction,
  countBulkSeoAction,
  planBulkSegmentsAction,
} from "@/features/seo/actions";
import type { BulkFillMode, BulkFillScope } from "@/features/seo/seo-bulk.service";
import {
  BULK_SEGMENT_THRESHOLD,
  DEFAULT_BULK_SEGMENT_SIZE,
} from "@/features/seo/platform/bulk/bulk-segment";
import type { BulkSegmentPlanEntry } from "@/features/seo/platform/bulk/bulk-segment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TARGETS: { value: BulkFillScope; label: string }[] = [
  { value: "products", label: "Products" },
  { value: "brands", label: "Brands" },
  { value: "collections", label: "Collections" },
  { value: "cms", label: "CMS pages" },
  { value: "posts", label: "Blog posts" },
  { value: "static", label: "Static pages" },
  { value: "all", label: "All" },
];

const PROFILES = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
  { value: "ai_assisted", label: "AI assisted" },
];

const MODES: { value: BulkFillMode; label: string }[] = [
  { value: "empty-only", label: "Fill empty only" },
  { value: "always", label: "Overwrite all" },
];

const SEGMENT_SIZE_OPTIONS = [25, 50, 100] as const;

type SimulationSummary = {
  totalMatched: number;
  willUpdate: number;
  skipped: number;
  failed: number;
  segmentIndex?: number;
};

type SegmentStatus = "pending" | "simulated" | "completed" | "failed";

type QueueProgress = {
  current: number;
  total: number;
  label: string;
};

function buildBulkFormData(
  target: BulkFillScope,
  mode: BulkFillMode,
  profileId: string,
  dryRun: boolean,
  segment?: BulkSegmentPlanEntry,
  segmentSize?: number,
  skipRevalidate = false
) {
  const fd = new FormData();
  fd.set("scope", target);
  fd.set("mode", mode);
  fd.set("profileId", profileId);
  fd.set("dryRun", dryRun ? "true" : "false");
  if (segment) {
    fd.set("offset", String(segment.offset));
    fd.set("limit", String(segment.limit));
    fd.set("segmentIndex", String(segment.index));
    fd.set("segmentSize", String(segmentSize ?? segment.limit));
  }
  if (skipRevalidate) {
    fd.set("skipRevalidate", "true");
  }
  return fd;
}

function isSegmentRequiredError(
  result: unknown
): result is { error: "SEGMENT_REQUIRED"; total: number } {
  return (
    typeof result === "object" &&
    result != null &&
    "error" in result &&
    (result as { error: string }).error === "SEGMENT_REQUIRED"
  );
}

export function BulkAutoFillPanel() {
  const [target, setTarget] = useState<BulkFillScope>("products");
  const [profileId, setProfileId] = useState("balanced");
  const [mode, setMode] = useState<BulkFillMode>("empty-only");
  const [count, setCount] = useState<number | null>(null);
  const [segmentSize, setSegmentSize] = useState(DEFAULT_BULK_SEGMENT_SIZE);
  const [segments, setSegments] = useState<BulkSegmentPlanEntry[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [segmentStatuses, setSegmentStatuses] = useState<Record<number, SegmentStatus>>({});
  const [simulation, setSimulation] = useState<SimulationSummary | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueProgress, setQueueProgress] = useState<QueueProgress | null>(null);
  const [isPending, startTransition] = useTransition();

  const requiresSegmentation = count != null && count > BULK_SEGMENT_THRESHOLD;
  const selectedSegment = segments[selectedSegmentIndex] ?? null;

  const resetSegmentState = useCallback(() => {
    setSegments([]);
    setSelectedSegmentIndex(0);
    setSegmentStatuses({});
    setSimulation(null);
    setRunResult(null);
    setErrorMessage(null);
    setQueueProgress(null);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const n = await countBulkSeoAction(target);
      setCount(n);
      resetSegmentState();
    });
  }, [target, resetSegmentState]);

  useEffect(() => {
    if (count == null || count <= BULK_SEGMENT_THRESHOLD) {
      setSegments([]);
      return;
    }
    startTransition(async () => {
      const plan = await planBulkSegmentsAction(target, segmentSize);
      setSegments(plan.segments);
      setSelectedSegmentIndex(0);
      setSegmentStatuses({});
      setSimulation(null);
      setRunResult(null);
    });
  }, [count, segmentSize, target]);

  const updateSegmentStatus = useCallback((index: number, status: SegmentStatus) => {
    setSegmentStatuses((prev) => ({ ...prev, [index]: status }));
  }, []);

  const runSimulation = useCallback(() => {
    startTransition(async () => {
      setErrorMessage(null);
      setRunResult(null);
      const fd = buildBulkFormData(
        target,
        mode,
        profileId,
        true,
        requiresSegmentation ? selectedSegment ?? undefined : undefined,
        segmentSize
      );
      const result = await bulkAutoFillAction(fd);

      if (isSegmentRequiredError(result)) {
        setErrorMessage(
          `${result.total.toLocaleString()} processing units require segment selection (max ${BULK_SEGMENT_THRESHOLD} per request).`
        );
        return;
      }

      if ("dryRun" in result && result.dryRun) {
        const segmentIndex = requiresSegmentation ? selectedSegmentIndex : undefined;
        setSimulation({
          totalMatched: result.totalMatched,
          willUpdate: result.estimatedChanges,
          skipped: result.skipped ?? Math.max(0, result.totalMatched - result.estimatedChanges),
          failed: result.failed ?? 0,
          segmentIndex,
        });
        if (segmentIndex != null) {
          updateSegmentStatus(segmentIndex, "simulated");
        }
      }
    });
  }, [
    target,
    mode,
    profileId,
    requiresSegmentation,
    selectedSegment,
    selectedSegmentIndex,
    segmentSize,
    updateSegmentStatus,
  ]);

  const runBulkSegment = useCallback(
    async (segment: BulkSegmentPlanEntry | null, skipRevalidate = false) => {
      const fd = buildBulkFormData(
        target,
        mode,
        profileId,
        false,
        requiresSegmentation ? segment ?? undefined : undefined,
        segmentSize,
        skipRevalidate
      );
      const result = await bulkAutoFillAction(fd);

      if (isSegmentRequiredError(result)) {
        throw new Error(
          `${result.total.toLocaleString()} processing units require segment selection.`
        );
      }

      if ("dryRun" in result && !result.dryRun) {
        return result;
      }

      throw new Error("Unexpected bulk autofill response");
    },
    [target, mode, profileId, requiresSegmentation, segmentSize]
  );

  const runBulk = useCallback(() => {
    startTransition(async () => {
      setErrorMessage(null);
      try {
        const result = await runBulkSegment(requiresSegmentation ? selectedSegment : null);
        if (requiresSegmentation && selectedSegment) {
          updateSegmentStatus(selectedSegment.index, "completed");
        }
        setRunResult(
          `Updated ${result.changed} · skipped ${result.skipped} · failed ${result.failed}`
        );
        setSimulation(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bulk autofill failed";
        setErrorMessage(message);
        if (requiresSegmentation && selectedSegment) {
          updateSegmentStatus(selectedSegment.index, "failed");
        }
      }
    });
  }, [requiresSegmentation, selectedSegment, runBulkSegment, updateSegmentStatus]);

  const runAllSegments = useCallback(() => {
    if (!segments.length) return;

    startTransition(async () => {
      setErrorMessage(null);
      setRunResult(null);
      let totalChanged = 0;
      let totalSkipped = 0;
      let totalFailed = 0;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        setQueueProgress({
          current: i + 1,
          total: segments.length,
          label: `Segment ${i + 1} / ${segments.length}`,
        });

        try {
          const isLast = i === segments.length - 1;
          const result = await runBulkSegment(segment, !isLast);
          totalChanged += result.changed;
          totalSkipped += result.skipped;
          totalFailed += result.failed;
          updateSegmentStatus(segment.index, "completed");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Segment failed";
          updateSegmentStatus(segment.index, "failed");
          setErrorMessage(`Stopped at segment ${i + 1}: ${message}`);
          setQueueProgress(null);
          return;
        }
      }

      setQueueProgress(null);
      setRunResult(
        `All segments complete — updated ${totalChanged} · skipped ${totalSkipped} · failed ${totalFailed}`
      );
      setSimulation(null);
    });
  }, [segments, runBulkSegment, updateSegmentStatus]);

  const canRunAll = useMemo(() => {
    if (!requiresSegmentation || segments.length === 0) return false;
    return segmentStatuses[0] === "simulated" || segmentStatuses[0] === "completed";
  }, [requiresSegmentation, segments.length, segmentStatuses]);

  const simulationMatchesSegment =
    !requiresSegmentation ||
    simulation?.segmentIndex == null ||
    simulation.segmentIndex === selectedSegmentIndex;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Auto-fill</CardTitle>
        <CardDescription>
          Simulate impact before running. Generation uses the same content snapshot pipeline as SEO
          analysis. Large scopes are processed in segments to avoid server timeouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Target</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value as BulkFillScope)}
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Profile</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Apply mode</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as BulkFillMode)}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {count != null ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{count.toLocaleString()}</span> processing
            units in scope
            <span
              className="ml-1 cursor-help underline decoration-dotted"
              title="Bilingual entities (EN + AR) count as two processing units each."
            >
              (?)
            </span>
          </p>
        ) : null}

        {requiresSegmentation ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Segment size</Label>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={segmentSize}
                  onChange={(e) => setSegmentSize(Number(e.target.value))}
                  disabled={isPending || queueProgress != null}
                >
                  {SEGMENT_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per segment
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                {segments.length} segment{segments.length === 1 ? "" : "s"} · max{" "}
                {BULK_SEGMENT_THRESHOLD} units per request
              </p>
            </div>

            <div className="space-y-2">
              <Label>Segment</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedSegmentIndex}
                onChange={(e) => {
                  setSelectedSegmentIndex(Number(e.target.value));
                  setSimulation(null);
                  setRunResult(null);
                }}
                disabled={isPending || queueProgress != null}
              >
                {segments.map((segment) => (
                  <option key={segment.index} value={segment.index}>
                    {segment.label}: {segment.rangeLabel}
                  </option>
                ))}
              </select>
            </div>

            <ul className="flex flex-wrap gap-2">
              {segments.map((segment) => {
                const status = segmentStatuses[segment.index] ?? "pending";
                return (
                  <li key={segment.index}>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                        selectedSegmentIndex === segment.index && "ring-2 ring-primary ring-offset-1",
                        status === "completed" && "border-emerald-300 bg-emerald-50 text-emerald-800",
                        status === "simulated" && "border-blue-300 bg-blue-50 text-blue-800",
                        status === "failed" && "border-red-300 bg-red-50 text-red-800",
                        status === "pending" && "border-muted bg-background text-muted-foreground"
                      )}
                      onClick={() => {
                        setSelectedSegmentIndex(segment.index);
                        setSimulation(null);
                        setRunResult(null);
                      }}
                      disabled={isPending || queueProgress != null}
                    >
                      {segment.index + 1}: {status}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {simulation && simulationMatchesSegment ? (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Matched</p>
              <p className="text-lg font-semibold tabular-nums">{simulation.totalMatched}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Will update</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-700">
                {simulation.willUpdate}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-lg font-semibold tabular-nums">{simulation.skipped}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold tabular-nums text-red-700">{simulation.failed}</p>
            </div>
          </div>
        ) : null}

        {queueProgress ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{queueProgress.label}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {queueProgress.current} of {queueProgress.total} segments
            </p>
          </div>
        ) : null}

        {runResult ? <p className="text-sm text-emerald-700">{runResult}</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runSimulation}
            disabled={isPending || queueProgress != null || (requiresSegmentation && !selectedSegment)}
          >
            {requiresSegmentation ? "Simulate segment" : "Simulate"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={runBulk}
            disabled={
              isPending ||
              queueProgress != null ||
              !simulation ||
              !simulationMatchesSegment ||
              (requiresSegmentation && !selectedSegment)
            }
          >
            {requiresSegmentation ? "Run segment" : "Run bulk auto-fill"}
          </Button>
          {requiresSegmentation ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={runAllSegments}
              disabled={isPending || queueProgress != null || !canRunAll}
            >
              Run all segments
            </Button>
          ) : null}
        </div>

        {!simulation ? (
          <p className="text-xs text-muted-foreground">
            {requiresSegmentation
              ? "Select a segment, simulate it, then run that segment or queue all segments."
              : "Run simulation before executing bulk changes."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
