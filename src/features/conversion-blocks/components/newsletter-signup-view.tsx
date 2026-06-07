"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { NewsletterSignupProps } from "@/features/conversion-blocks/schemas/conversion-blocks";

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
    titleEn,
    titleAr,
    subtitleEn,
    subtitleAr,
    layout,
    segment,
    incentiveEn,
    incentiveAr,
    doubleOptIn,
    showNameField,
    successMessageEn,
    successMessageAr,
    pendingMessageEn,
    pendingMessageAr,
    webhookUrl,
  } = props;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "pending" | "error">("idle");

  const title = locale.startsWith("ar") ? titleAr || titleEn : titleEn || titleAr;
  const subtitle = locale.startsWith("ar") ? subtitleAr || subtitleEn : subtitleEn || subtitleAr;
  const incentive = locale.startsWith("ar") ? incentiveAr || incentiveEn : incentiveEn || incentiveAr;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setStatus(data.status === "CONFIRMED" && !doubleOptIn ? "success" : data.alreadySubscribed ? "success" : "pending");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return <p className="text-sm text-primary">{locale.startsWith("ar") ? successMessageAr : successMessageEn}</p>;
  }
  if (status === "pending") {
    return <p className="text-sm text-primary">{locale.startsWith("ar") ? pendingMessageAr : pendingMessageEn}</p>;
  }

  return (
    <div className={cn(layout === "banner" && "rounded-2xl bg-primary/5 p-6", layout === "card" && "rounded-2xl border p-6")}>
      {title && <h3 className="font-semibold">{title}</h3>}
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      {incentive && <p className="text-xs text-primary mt-2">{incentive}</p>}
      <form onSubmit={submit} className={cn("mt-4 flex gap-2", layout === "inline" ? "flex-row flex-wrap items-end" : "flex-col")}>
        {showNameField && (
          <div className={layout === "inline" ? "min-w-[140px]" : ""}>
            <Label className="sr-only">Name</Label>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className={layout === "inline" ? "flex-1 min-w-[200px]" : ""}>
          <Label className="sr-only">Email</Label>
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={status === "loading"}>
          Subscribe
        </Button>
      </form>
      {status === "error" && <p className="text-sm text-destructive mt-2">Subscription failed.</p>}
    </div>
  );
}
