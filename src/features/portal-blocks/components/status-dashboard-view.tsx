"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";
import type { StatusBoardPublic } from "@/features/status/types";

type Props = {
  locale: Locale;
  board: StatusBoardPublic;
  title?: string;
  subtitle?: string;
  layout?: "compact" | "full";
  showUptime?: boolean;
  showIncidents?: boolean;
  showMaintenance?: boolean;
  pollingIntervalMs?: number;
  refreshUrl?: string;
};

const HEALTH_STYLES: Record<string, string> = {
  operational: "bg-green-500",
  degraded: "bg-amber-500",
  "partial-outage": "bg-orange-500",
  "major-outage": "bg-red-500",
  maintenance: "bg-blue-500",
};

export function StatusDashboardView({
  locale,
  board: initial,
  title,
  subtitle,
  layout = "full",
  showUptime = true,
  showIncidents = true,
  showMaintenance = true,
  pollingIntervalMs = 60000,
  refreshUrl,
}: Props) {
  const [board, setBoard] = useState(initial);

  const refresh = useCallback(async () => {
    if (!refreshUrl) return;
    try {
      const res = await fetch(refreshUrl, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as StatusBoardPublic;
        setBoard(data);
      }
    } catch {
      /* ignore polling errors */
    }
  }, [refreshUrl]);

  useEffect(() => {
    setBoard(initial);
  }, [initial]);

  useEffect(() => {
    if (!refreshUrl || pollingIntervalMs < 5000) return;
    const id = setInterval(refresh, pollingIntervalMs);
    return () => clearInterval(id);
  }, [refresh, refreshUrl, pollingIntervalMs]);

  const openIncidents = board.incidents.filter((i) => !i.resolvedAt);

  return (
    <div className={cn("pb-status", `pb-status--${layout}`)}>
      {title && <h2 className="pb-status__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-status__subtitle text-muted-foreground mb-4">{subtitle}</p>}
      <ul className="pb-status__services space-y-2">
        {board.services.map((service) => (
          <li
            key={service.id}
            className="pb-status__service flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
          >
            <div>
              <span className="font-medium">{pickLocale(service, "name", locale)}</span>
              {showUptime && (
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {service.uptimePercent.toFixed(2)}% uptime
                </span>
              )}
            </div>
            <span className="flex items-center gap-2 text-sm capitalize">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  HEALTH_STYLES[service.status] ?? "bg-muted-foreground"
                )}
              />
              {service.status.replace(/-/g, " ")}
            </span>
          </li>
        ))}
      </ul>
      {showIncidents && openIncidents.length > 0 && (
        <section className="pb-status__incidents mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {locale.startsWith("ar") ? "حوادث نشطة" : "Active incidents"}
          </h3>
          <ul className="space-y-3">
            {openIncidents.map((inc) => (
              <li key={inc.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <h4 className="font-medium">{pickLocale(inc, "title", locale)}</h4>
                <p className="text-sm text-muted-foreground mt-1">{pickLocale(inc, "message", locale)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {showMaintenance && board.maintenance.length > 0 && (
        <section className="pb-status__maintenance mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {locale.startsWith("ar") ? "صيانة مجدولة" : "Scheduled maintenance"}
          </h3>
          <ul className="space-y-3">
            {board.maintenance.map((m) => (
              <li key={m.id} className="rounded-lg border p-4">
                <h4 className="font-medium">{pickLocale(m, "title", locale)}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(m.startsAt).toLocaleString(locale)} – {new Date(m.endsAt).toLocaleString(locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
