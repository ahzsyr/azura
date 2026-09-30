"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeSeoSetupAction, markSeoSetupStepAction, skipSeoSetupAction } from "../actions";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { SEO_SETUP_STEPS, type SeoSetupState } from "../types";

type Props = {
  setup: SeoSetupState;
  siteName: string;
  siteUrl: string;
  googleConnected: boolean;
  bingConnected: boolean;
  indexNowConnected: boolean;
};

export function SeoSetupWizard({
  setup,
  siteName,
  siteUrl,
  googleConnected,
  bingConnected,
  indexNowConnected,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const firstIncomplete = SEO_SETUP_STEPS.findIndex((step) => !setup.steps[step.id]);
  const [step, setStep] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);
  const current = SEO_SETUP_STEPS[step];

  function goNext() {
    startTransition(async () => {
      const finishing = step >= SEO_SETUP_STEPS.length - 1;
      try {
        await runAdminAction(
          finishing ? "Finishing setup…" : "Saving this step…",
          async () => {
            await markSeoSetupStepAction(current.id, true);
            if (finishing) await completeSeoSetupAction();
          },
          finishing ? "SEO setup complete." : `${current.label} saved.`,
        );
      } catch {
        return;
      }
      if (finishing) {
        router.push("/admin/seo");
        router.refresh();
        return;
      }
      setStep((n) => n + 1);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Let&apos;s set up your SEO</p>
        <div className="mt-3 flex gap-2">
          {SEO_SETUP_STEPS.map((item, index) => (
            <div
              key={item.id}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-foreground" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {step + 1} of {SEO_SETUP_STEPS.length}: {current.label}
        </p>
      </div>

      {current.id === "site-information" ? (
        <section className="space-y-4 rounded-xl border p-5">
          <div className="space-y-2">
            <Label>Site name</Label>
            <Input defaultValue={siteName} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input defaultValue={siteUrl} readOnly />
          </div>
          <p className="text-sm text-muted-foreground">
            Change company details in{" "}
            <Link href="/admin/company" className="text-primary hover:underline">
              Company Info
            </Link>
            .
          </p>
        </section>
      ) : null}

      {current.id === "search-appearance" ? (
        <section className="space-y-3 rounded-xl border p-5 text-sm">
          <p>Title and description patterns control how pages appear in search results.</p>
          <Button asChild variant="outline">
            <Link href="/admin/seo/templates">Open Search Appearance</Link>
          </Button>
        </section>
      ) : null}

      {current.id === "search-engines" ? (
        <section className="space-y-3 rounded-xl border p-5 text-sm">
          <p>Google: {googleConnected ? "Connected" : "Not connected"}</p>
          <p>Bing: {bingConnected ? "Connected" : "Not connected"}</p>
          <p>IndexNow: {indexNowConnected ? "Connected" : "Not connected"}</p>
          <Button asChild variant="outline">
            <Link href="/admin/seo/integrations">Connect search engines</Link>
          </Button>
        </section>
      ) : null}

      {current.id === "seo-defaults" ? (
        <section className="space-y-2 rounded-xl border p-5 text-sm">
          <p>✓ Sitemap</p>
          <p>✓ Robots.txt</p>
          <p>✓ Canonicals</p>
          <p>✓ Open Graph</p>
          <p>✓ Structured data</p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={goNext}>
          {step >= SEO_SETUP_STEPS.length - 1 ? "Finish setup" : "Continue"}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              try {
                await runAdminAction(
                  "Skipping setup…",
                  () => skipSeoSetupAction(),
                  "Setup skipped. You can continue from the dashboard.",
                );
              } catch {
                return;
              }
              router.push("/admin/seo");
              router.refresh();
            });
          }}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
