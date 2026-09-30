"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type SeoHealthStatus = "healthy" | "attention" | "unknown";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
  disabled?: boolean;
};

type Props = {
  title: string;
  status: SeoHealthStatus;
  statusLabel?: string;
  stats: Array<{ label: string; value: string }>;
  attention?: string[];
  actions?: Action[];
  immediate?: ReactNode;
  advanced?: ReactNode;
  advancedOpen?: boolean;
};

const statusClass: Record<SeoHealthStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  unknown: "border-slate-200 bg-slate-50 text-slate-800",
};

export function SeoHealthLayout({
  title,
  status,
  statusLabel,
  stats,
  attention = [],
  actions = [],
  immediate,
  advanced,
  advancedOpen = false,
}: Props) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className={cn("rounded-xl border px-5 py-4", statusClass[status])}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
        <p className="mt-1 text-2xl font-semibold">
          {statusLabel ?? (status === "healthy" ? "Healthy" : status === "attention" ? "Needs attention" : "Not checked yet")}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-sm font-medium">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {attention.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Needs attention</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {attention.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {immediate}

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const button = (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? "default"}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
            if (action.href && !action.onClick) {
              return (
                <Button key={action.label} asChild variant={action.variant ?? "default"}>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              );
            }
            return button;
          })}
        </div>
      ) : null}

      {advanced ? (
        <details className="rounded-xl border" open={advancedOpen || undefined}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Advanced Settings</summary>
          <div className="border-t px-4 py-4">{advanced}</div>
        </details>
      ) : null}
    </div>
  );
}
