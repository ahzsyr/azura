"use client";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card/50 p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HorizontalBarChart({
  items,
  valueKey,
  labelKey,
  maxItems = 10,
  className,
}: {
  items: { [key: string]: string | number }[];
  valueKey: string;
  labelKey: string;
  maxItems?: number;
  className?: string;
}) {
  const slice = items.slice(0, maxItems);
  const max = Math.max(1, ...slice.map((i) => Number(i[valueKey]) || 0));

  if (!slice.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)} role="list">
      {slice.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        const label = String(item[labelKey]);
        return (
          <li key={`${label}-${i}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium" title={label}>
                {label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{val}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="presentation"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary/80 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyActivityChart({
  series,
  className,
}: {
  series: { date: string; searches: number; clicks: number; zeroResults: number }[];
  className?: string;
}) {
  if (!series.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity in this period
      </p>
    );
  }

  const max = Math.max(
    1,
    ...series.flatMap((d) => [d.searches, d.clicks, d.zeroResults])
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" aria-hidden /> Searches
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/80" aria-hidden /> Clicks
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-500/70" aria-hidden /> No results
        </span>
      </div>
      <div
        className="flex items-end gap-1 overflow-x-auto pb-1"
        role="img"
        aria-label="Daily search activity chart"
      >
        {series.map((d) => (
          <div
            key={d.date}
            className="flex min-w-[28px] flex-1 flex-col items-center gap-0.5"
            title={`${d.date}: ${d.searches} searches, ${d.clicks} clicks`}
          >
            <div className="flex h-24 w-full items-end justify-center gap-px">
              <div
                className="w-2 rounded-t bg-primary/85"
                style={{ height: `${(d.searches / max) * 100}%`, minHeight: d.searches ? 4 : 0 }}
              />
              <div
                className="w-2 rounded-t bg-emerald-500/75"
                style={{ height: `${(d.clicks / max) * 100}%`, minHeight: d.clicks ? 4 : 0 }}
              />
              <div
                className="w-1 rounded-t bg-amber-500/60"
                style={{
                  height: `${(d.zeroResults / max) * 100}%`,
                  minHeight: d.zeroResults ? 3 : 0,
                }}
              />
            </div>
            <span className="text-[0.6rem] text-muted-foreground">
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
