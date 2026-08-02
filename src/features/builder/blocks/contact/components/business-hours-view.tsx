"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_LABELS,
  WEEKDAY_VALUES,
  type BusinessHoursDay,
  type Weekday,
} from "@/features/builder/blocks/contact/schemas/business-hours";

type Props = {
  days: BusinessHoursDay[];
  className?: string;
  compact?: boolean;
  showStatus?: boolean;
};

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
}

function toMinutes(hhmm: string): number | null {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) return null;
  return h * 60 + m;
}

function weekdayFromDate(date: Date): Weekday {
  // JS: 0 = Sunday … 6 = Saturday
  const index = date.getDay();
  const map: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[index] ?? "monday";
}

function resolveOpenNow(days: BusinessHoursDay[], now = new Date()) {
  const todayKey = weekdayFromDate(now);
  const today = days.find((d) => d.day === todayKey);
  if (!today || today.closed) {
    return { todayKey, openNow: false, today };
  }
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (open == null || close == null) {
    return { todayKey, openNow: false, today };
  }
  const current = now.getHours() * 60 + now.getMinutes();
  const openNow = close > open ? current >= open && current < close : current >= open || current < close;
  return { todayKey, openNow, today };
}

export function BusinessHoursView({ days, className, compact, showStatus = true }: Props) {
  const t = useTranslations("contact");
  const status = useMemo(() => resolveOpenNow(days), [days]);

  if (!days?.length) return null;

  const ordered = WEEKDAY_VALUES.map((day) => days.find((d) => d.day === day)).filter(
    (d): d is BusinessHoursDay => Boolean(d),
  );
  const rows = ordered.length ? ordered : days;

  if (compact) {
    return (
      <div className={cn("space-y-2.5", className)}>
        {showStatus ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t("hours")}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                status.openNow
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status.openNow ? "bg-emerald-500" : "bg-muted-foreground/50",
                )}
              />
              {status.openNow ? t("openNow") : t("closedNow")}
            </span>
          </div>
        ) : null}

        <ul className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
          {rows.map((d, index) => {
            const isToday = d.day === status.todayKey;
            return (
              <li
                key={d.day}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors",
                  index > 0 && "border-t border-border/60",
                  isToday && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 font-medium",
                    isToday ? "text-foreground" : "text-foreground/80",
                    d.closed && !isToday && "text-muted-foreground",
                  )}
                >
                  {WEEKDAY_LABELS[d.day].slice(0, 3)}
                  {isToday ? (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {t("today")}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "tabular-nums tracking-tight",
                    d.closed ? "font-medium text-muted-foreground" : "text-foreground/85",
                    isToday && !d.closed && "font-semibold text-foreground",
                  )}
                >
                  {d.closed ? t("closed") : `${formatTime(d.open)} – ${formatTime(d.close)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/70", className)}>
      {showStatus ? (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("businessHours")}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              status.openNow
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-background text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status.openNow ? "bg-emerald-500" : "bg-muted-foreground/50",
              )}
            />
            {status.openNow ? t("openNow") : t("closedNow")}
          </span>
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 text-start text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">{t("day")}</th>
            <th className="px-3 py-2 font-medium">{t("hours")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const isToday = d.day === status.todayKey;
            return (
              <tr
                key={d.day}
                className={cn("border-t border-border/60", isToday && "bg-primary/5")}
              >
                <td className={cn("px-3 py-2.5 font-medium", isToday && "text-foreground")}>
                  <span className="inline-flex items-center gap-2">
                    {WEEKDAY_LABELS[d.day]}
                    {isToday ? (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {t("today")}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 tabular-nums text-muted-foreground",
                    isToday && "font-semibold text-foreground",
                  )}
                >
                  {d.closed ? t("closed") : `${formatTime(d.open)} – ${formatTime(d.close)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
