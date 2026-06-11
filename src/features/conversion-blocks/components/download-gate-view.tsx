"use client";

import { useState } from "react";
import { Lock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicFormView } from "@/features/conversion-blocks/components/dynamic-form-view";
import type { FormTemplateDefinition } from "@/features/forms/types";
import type { DownloadGateProps } from "@/features/conversion-blocks/schemas/conversion-blocks";
import { cn } from "@/lib/utils";

type Props = DownloadGateProps & {
  locale: string;
  blockId?: string;
  fileName?: string;
  fileUrl?: string;
  formDefinition?: FormTemplateDefinition | null;
};

export function DownloadGateView({
  locale,
  blockId,
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  mediaAssetId,
  fileLabelEn,
  fileLabelAr,
  unlockMethod,
  templateId,
  newsletterSegment,
  externalUrl,
  expiryHours,
  fileName,
  formDefinition,
}: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const title = locale.startsWith("ar") ? titleAr || titleEn : titleEn || titleAr;
  const description = locale.startsWith("ar") ? descriptionAr || descriptionEn : descriptionEn || descriptionEn;
  const fileLabel = locale.startsWith("ar") ? fileLabelAr : fileLabelEn;

  const requestUnlock = async (extra?: { submissionId?: string; subscriberId?: string }) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/download-gate/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaAssetId,
          unlockMethod:
            unlockMethod === "formTemplate" ? "FORM" : unlockMethod === "newsletter" ? "NEWSLETTER" : "EXTERNAL",
          email: email || undefined,
          expiryHours,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error("Unlock failed");
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
      setUnlocked(true);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  if (unlockMethod === "externalUrl" && externalUrl) {
    return (
      <div className="rounded-2xl border p-6 text-center space-y-3">
        {title && <h3 className="font-semibold">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <Button asChild>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            {fileLabel}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-6 space-y-4", !unlocked && "bg-muted/30")}>
      <div className="flex items-start gap-3">
        {!unlocked ? <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /> : <Download className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
        <div>
          {title && <h3 className="font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          {fileName && <p className="text-xs text-muted-foreground mt-2">{fileName}</p>}
        </div>
      </div>

      {unlocked ? (
        <Button asChild>
          <a href={downloadUrl} download>
            {fileLabel}
          </a>
        </Button>
      ) : unlockMethod === "newsletter" ? (
        <div className="space-y-3 max-w-md">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <Button
            disabled={status === "loading" || !email}
            onClick={async () => {
              const sub = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, segment: newsletterSegment, locale, doubleOptIn: false }),
              });
              const data = await sub.json();
              await requestUnlock({ subscriberId: data.id });
            }}
          >
            Subscribe & unlock
          </Button>
        </div>
      ) : formDefinition && templateId ? (
        <DynamicFormView
          templateId={templateId}
          definition={formDefinition}
          locale={locale}
          blockType="downloadGate"
          blockId={blockId}
          successMessage={locale.startsWith("ar") ? "تم فتح التحميل." : "Download unlocked."}
          onSuccess={() => requestUnlock()}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Configure a form template to unlock this file.</p>
      )}
      {status === "error" && <p className="text-sm text-destructive">Could not unlock download.</p>}
    </div>
  );
}
