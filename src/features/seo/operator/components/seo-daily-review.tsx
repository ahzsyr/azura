"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setSeoTaskStatusAction } from "../actions";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import type { SeoTask } from "../types";
import { countTasksBySeverity } from "../task-builder";

type StepId = "critical" | "metadata" | "indexing" | "complete";

export function SeoDailyReview({ tasks }: { tasks: SeoTask[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<StepId>("critical");
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [deferred, setDeferred] = useState(0);

  const open = tasks.filter((task) => task.status === "open");
  const counts = countTasksBySeverity(open);
  const critical = open.filter((task) => task.severity === "critical");
  const metadata = open.filter((task) => task.type === "metadata");
  const indexing = open.filter((task) => task.type === "indexing");

  const currentList = step === "critical" ? critical : step === "metadata" ? metadata : indexing;
  const current = currentList[index];

  const summary = useMemo(
    () => ({ reviewed, fixed, deferred }),
    [reviewed, fixed, deferred],
  );

  function nextStep() {
    setIndex(0);
    if (step === "critical") setStep("metadata");
    else if (step === "metadata") setStep("indexing");
    else setStep("complete");
  }

  function mark(status: "completed" | "deferred" | "ignored") {
    if (!current) {
      nextStep();
      return;
    }
    startTransition(async () => {
      const labels = {
        completed: { running: "Saving fix…", done: "Marked as fixed." },
        deferred: { running: "Skipping for now…", done: "Skipped for now." },
        ignored: { running: "Ignoring…", done: "Ignored." },
      } as const;
      try {
        await runAdminAction(labels[status].running, () => setSeoTaskStatusAction(current.id, status), labels[status].done);
      } catch {
        return;
      }
      setReviewed((n) => n + 1);
      if (status === "completed") setFixed((n) => n + 1);
      if (status === "deferred" || status === "ignored") setDeferred((n) => n + 1);
      if (index + 1 >= currentList.length) nextStep();
      else setIndex((n) => n + 1);
      router.refresh();
    });
  }

  if (step === "complete") {
    return (
      <div className="rounded-xl border p-6 text-center">
        <p className="text-2xl font-semibold">Daily SEO complete</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {summary.reviewed} tasks reviewed · {summary.fixed} fixed · {summary.deferred} deferred
        </p>
        <p className="mt-4 text-sm">Next review: tomorrow</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/admin/seo">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today&apos;s SEO Review</p>
        <p className="mt-2 text-sm">
          {counts.critical} Critical · {counts.important} Important · {counts.recommended} Recommended
        </p>
      </div>

      <div className="rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {step === "critical" ? "1" : step === "metadata" ? "2" : "3"} ·{" "}
          {step === "critical" ? "Critical issues" : step === "metadata" ? "Metadata" : "Indexing"}
        </p>

        {!current ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Nothing in this step.</p>
            <Button onClick={nextStep}>Next</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              {index + 1} / {currentList.length}
            </p>
            <h2 className="text-xl font-semibold">{current.title}</h2>
            {current.entity?.url ? (
              <p className="font-mono text-sm text-muted-foreground">{current.entity.url}</p>
            ) : null}
            <p className="text-sm">{current.description}</p>
            {current.whyItMatters ? (
              <p className="text-sm">
                <span className="font-medium">Why this matters. </span>
                {current.whyItMatters}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {current.action?.href ? (
                <Button asChild>
                  <Link href={current.action.href}>{current.action.label}</Link>
                </Button>
              ) : (
                <Button disabled={pending} onClick={() => mark("completed")}>
                  Fix issue
                </Button>
              )}
              <Button variant="outline" disabled={pending} onClick={() => mark("deferred")}>
                Skip
              </Button>
              <Button variant="ghost" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
