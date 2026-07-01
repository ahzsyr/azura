"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WhatsAppFeedbackBanner({
  message,
  variant = "success",
}: {
  message: string | null;
  variant?: "success" | "error";
}) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
      )}
    >
      {message}
    </p>
  );
}

export function WhatsAppSettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function WhatsAppToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function WhatsAppStatusCard({
  title,
  description,
  enabled,
  onConfigure,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onConfigure?: () => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      {onConfigure ? (
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={onConfigure}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Configure
          </button>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function WhatsAppPreviewFrame({
  title = "Preview",
  description,
  children,
  className,
  minHeight = 220,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  minHeight?: number;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent
        className="relative overflow-hidden bg-gradient-to-b from-muted/20 to-muted/50 p-0"
        style={{ minHeight }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,211,102,0.08),transparent_45%)]" />
        <div className="relative h-full min-h-[inherit] p-5">{children}</div>
      </CardContent>
    </Card>
  );
}
