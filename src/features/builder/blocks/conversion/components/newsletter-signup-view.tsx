"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NewsletterSignupProps } from "@/features/builder/blocks/conversion/schemas/conversion-blocks";
import { resolveTopLevelField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import {
  FieldWrapper,
  FormExperience,
  isFxsEnabled,
  SmartEmailInput,
  isFxsSmartInputsEnabled,
} from "@/features/forms/fxs";

type Props = NewsletterSignupProps & {
  locale: string;
  blockId?: string;
  pageSlug?: string;
};

export function NewsletterSignupView(props: Props) {
  const {
    locale,
    blockId,
    pageSlug,
    layout,
    segment,
    doubleOptIn,
    showNameField,
    webhookUrl,
  } = props;

  const propsRecord = props as Record<string, unknown>;
  const title = resolveTopLevelField(propsRecord, "title", locale);
  const subtitle = resolveTopLevelField(propsRecord, "subtitle", locale);
  const incentive = resolveTopLevelField(propsRecord, "incentive", locale);
  const successMessage = resolveTopLevelField(propsRecord, "successMessage", locale);
  const pendingMessage = resolveTopLevelField(propsRecord, "pendingMessage", locale);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "pending" | "error">("idle");
  const fxsOn = isFxsEnabled();
  const smart = isFxsSmartInputsEnabled();

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          segment,
          locale,
          doubleOptIn,
          blockId,
          pageSlug,
          webhookUrl: webhookUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setStatus(
        data.status === "CONFIRMED" && !doubleOptIn
          ? "success"
          : data.alreadySubscribed
            ? "success"
            : "pending",
      );
    } catch {
      setStatus("error");
    }
  };

  if (!fxsOn) {
    if (status === "success") {
      return <p className="text-sm text-primary">{successMessage}</p>;
    }
    if (status === "pending") {
      return <p className="text-sm text-primary">{pendingMessage}</p>;
    }
    return (
      <div
        className={cn(
          layout === "banner" && "rounded-2xl bg-primary/5 p-6",
          layout === "card" && "rounded-2xl border p-6",
        )}
      >
        {title && <h3 className="font-semibold">{title}</h3>}
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        {incentive && <p className="text-xs text-primary mt-2">{incentive}</p>}
        <form
          onSubmit={submit}
          className={cn(
            "mt-4 flex gap-2",
            layout === "inline" ? "flex-row flex-wrap items-end" : "flex-col",
          )}
        >
          {showNameField && (
            <div className={layout === "inline" ? "min-w-[140px]" : ""}>
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className={layout === "inline" ? "flex-1 min-w-[200px]" : ""}>
            <Input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === "loading"}>
            Subscribe
          </Button>
        </form>
        {status === "error" && (
          <p className="text-sm text-destructive mt-2">Subscription failed.</p>
        )}
      </div>
    );
  }

  const mappedStatus =
    status === "loading"
      ? "submitting"
      : status === "success" || status === "pending"
        ? "success"
        : status === "error"
          ? "error"
          : "idle";

  return (
    <FormExperience
      config={{
        title: title || "Stay in the loop",
        description: subtitle || incentive || "Product news and offers — unsubscribe anytime.",
        layoutMode: "compact",
        theme: "minimal",
        showHero: true,
        estimatedMinutes: 1,
        successTitle: status === "pending" ? pendingMessage : successMessage,
        successDescription:
          status === "pending"
            ? "Please confirm your email to finish subscribing."
            : "You're on the list.",
      }}
      status={mappedStatus}
      onRetry={() => setStatus("idle")}
      sticky={{
        primaryLabel: status === "loading" ? "Subscribing…" : "Subscribe →",
        loading: status === "loading",
        onPrimary: () => void submit(),
      }}
      className={cn(
        layout === "banner" && "rounded-2xl bg-primary/5 p-4",
        layout === "card" && "rounded-2xl border p-4",
      )}
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        {showNameField ? (
          <FieldWrapper id="newsletter-name" label="Name" optional>
            <Input
              id="newsletter-name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
            />
          </FieldWrapper>
        ) : null}
        {smart ? (
          <SmartEmailInput
            id="newsletter-email"
            label="Email"
            required
            value={email}
            onChange={setEmail}
          />
        ) : (
          <FieldWrapper id="newsletter-email" label="Email" required>
            <Input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </FieldWrapper>
        )}
      </form>
    </FormExperience>
  );
}
