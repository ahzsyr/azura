"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setSeoTaskStatusAction } from "../actions";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import type { SeoTask, SeoTaskSeverity } from "../types";
import { countTasksBySeverity } from "../task-builder";
import { cn } from "@/lib/utils";

const severityLabel: Record<SeoTaskSeverity, string> = {
  critical: "Critical",
  important: "Important",
  recommended: "Recommended",
};

type Props = {
  tasks: SeoTask[];
  initialSeverity?: SeoTaskSeverity | "all";
  initialSource?: string;
  initialCategory?: string;
};

export function SeoTaskInbox({
  tasks,
  initialSeverity = "all",
  initialSource,
  initialCategory,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeoTaskSeverity | "all">(initialSeverity);
  const [status, setStatus] = useState<"open" | "all">("open");

  const counts = countTasksBySeverity(tasks.filter((task) => task.status === "open"));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (status === "open" && task.status !== "open") return false;
      if (severity !== "all" && task.severity !== severity) return false;
      if (initialSource && task.source !== initialSource) return false;
      if (initialCategory && task.category !== initialCategory) return false;
      if (q && !`${task.title} ${task.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, severity, status, initialSource, initialCategory]);

  function setStatusAndRefresh(taskId: string, next: "ignored" | "completed" | "deferred") {
    const labels = {
      ignored: { running: "Ignoring task…", done: "Task ignored." },
      completed: { running: "Marking task done…", done: "Task marked done." },
      deferred: { running: "Deferring task…", done: "Task deferred." },
    } as const;
    startTransition(async () => {
      try {
        await runAdminAction(labels[next].running, () => setSeoTaskStatusAction(taskId, next), labels[next].done);
        router.refresh();
      } catch {
        // Toast already shows the error.
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <CountChip label="Critical" value={counts.critical} active={severity === "critical"} onClick={() => setSeverity("critical")} />
        <CountChip label="Important" value={counts.important} active={severity === "important"} onClick={() => setSeverity("important")} />
        <CountChip label="Recommended" value={counts.recommended} active={severity === "recommended"} onClick={() => setSeverity("recommended")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={severity === "all" ? "default" : "outline"} onClick={() => setSeverity("all")}>
          All
        </Button>
        <Button size="sm" variant={status === "open" ? "default" : "outline"} onClick={() => setStatus("open")}>
          Open
        </Button>
        <Button size="sm" variant={status === "all" ? "default" : "outline"} onClick={() => setStatus("all")}>
          Including done
        </Button>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No tasks match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => (
            <li key={task.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {severityLabel[task.severity]}
                  </p>
                  <h2 className="mt-1 font-medium">{task.title}</h2>
                  {task.entity?.url ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{task.entity.url}</p>
                  ) : null}
                </div>
                <span className="text-xs capitalize text-muted-foreground">{task.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
              {task.whyItMatters ? (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Why it matters. </span>
                  {task.whyItMatters}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {task.action?.href ? (
                  <Button asChild size="sm">
                    <Link href={task.action.href}>{task.action.label}</Link>
                  </Button>
                ) : null}
                {task.status === "open" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setStatusAndRefresh(task.id, "ignored")}
                    >
                      Ignore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setStatusAndRefresh(task.id, "deferred")}
                    >
                      Defer
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left",
        active ? "border-foreground" : "hover:bg-muted/40",
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </button>
  );
}
