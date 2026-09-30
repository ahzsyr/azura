"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCampaignAction } from "@/modules/marketing/actions";

const SOURCE_OPTIONS = [
  { value: "", label: "Select source…" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta", label: "Meta Ads" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "radio", label: "Radio" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const MEDIUM_OPTIONS = [
  { value: "", label: "Select medium…" },
  { value: "paid", label: "Paid" },
  { value: "organic", label: "Organic" },
  { value: "social", label: "Social" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "offline", label: "Offline" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CampaignCreateModal({ open, onOpenChange }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (next) setFormKey((k) => k + 1);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>
            Set a name and identifier. We generate a shareable tracking link for your landing page.
          </DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          ref={formRef}
          id="marketing-campaign-create-form"
          action={createCampaignAction}
          className="grid gap-3 md:grid-cols-2"
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input id="campaign-name" name="name" required placeholder="Summer Radio Campaign" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-internalId">Identifier</Label>
            <Input
              id="campaign-internalId"
              name="internalId"
              placeholder="campaign1 (auto from name if empty)"
            />
              <p className="text-xs text-muted-foreground">
                Share link will look like <code>/a?campaign1</code>.
              </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-landingPagePath">Landing page</Label>
            <Input
              id="campaign-landingPagePath"
              name="landingPagePath"
              required
              placeholder="/contact"
              defaultValue="/contact"
            />
          </div>

          <details className="md:col-span-2 rounded border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Advanced (optional source, medium, dates, status)
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-utmSource">Source</Label>
                <select
                  id="campaign-utmSource"
                  name="utmSource"
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-utmMedium">Medium</Label>
                <select
                  id="campaign-utmMedium"
                  name="utmMedium"
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {MEDIUM_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-utmContent">Content / ad identifier</Label>
                <Input
                  id="campaign-utmContent"
                  name="utmContent"
                  placeholder="Optional creative or ad id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-status">Status</Label>
                <select
                  id="campaign-status"
                  name="status"
                  defaultValue="ACTIVE"
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-startDate">Start date</Label>
                <Input id="campaign-startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-endDate">End date</Label>
                <Input id="campaign-endDate" name="endDate" type="date" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="campaign-notes">Notes</Label>
                <Input id="campaign-notes" name="notes" placeholder="Optional campaign notes" />
              </div>
            </div>
          </details>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.requestSubmit()}>
            Create campaign &amp; generate link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
