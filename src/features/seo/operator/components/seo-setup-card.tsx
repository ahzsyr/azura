import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { SeoSetupState } from "../types";
import { SEO_SETUP_STEPS } from "../types";

export function SeoSetupCard({ setup }: { setup: SeoSetupState }) {
  if (setup.complete) return null;

  const done = SEO_SETUP_STEPS.filter((step) => setup.steps[step.id]).length;

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO Setup</p>
      <p className="mt-2 text-sm font-medium">
        Your SEO configuration is {done} of {SEO_SETUP_STEPS.length} steps complete.
      </p>
      <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        {SEO_SETUP_STEPS.map((step) => (
          <li key={step.id} className={setup.steps[step.id] ? "text-emerald-800" : "text-muted-foreground"}>
            {setup.steps[step.id] ? "✓" : "○"} {step.label}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Button asChild>
          <Link href="/admin/seo/setup">Continue Setup</Link>
        </Button>
      </div>
    </section>
  );
}
