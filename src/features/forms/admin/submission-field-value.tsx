"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Mail, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormFieldDefinition } from "@/features/forms/types";
import { cn } from "@/lib/utils";

function looksLikeEmail(key: string, value: unknown, fieldType?: string): value is string {
  if (fieldType === "email") return typeof value === "string" && value.includes("@");
  return (
    typeof value === "string" &&
    value.includes("@") &&
    (key.toLowerCase().includes("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
  );
}

function looksLikePhone(key: string, value: unknown, fieldType?: string): value is string {
  if (fieldType === "phone") return typeof value === "string" && value.trim().length > 0;
  if (typeof value !== "string" || !value.trim()) return false;
  const k = key.toLowerCase();
  return k.includes("phone") || k.includes("tel") || k.includes("mobile");
}

function looksLikeUrl(key: string, value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  const k = key.toLowerCase();
  return (k.includes("url") || k.includes("website") || k.includes("link")) && trimmed.includes(".");
}

function looksLikeFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) {
    return /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|png|jpe?g|gif|webp|svg|mp4|webm)(\?|#|$)/i.test(
      trimmed,
    );
  }
  return (
    trimmed.startsWith("/uploads/") ||
    trimmed.startsWith("uploads/") ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|png|jpe?g|gif|webp|svg|mp4|webm)(\?|#|$)/i.test(trimmed)
  );
}

function isMultiline(key: string, formatted: string, fieldType?: string): boolean {
  if (fieldType === "textarea") return true;
  if (formatted.includes("\n")) return true;
  const k = key.toLowerCase();
  return (
    k.includes("message") ||
    k.includes("detail") ||
    k.includes("description") ||
    k.includes("feedback") ||
    k.includes("note") ||
    k.includes("comment") ||
    formatted.length > 120
  );
}

function formatScalar(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function FileValue({ value }: { value: Record<string, unknown> | string }) {
  const record =
    typeof value === "string"
      ? { url: value, name: value.split("/").pop()?.split("?")[0] || "Attachment" }
      : value;
  const name =
    (typeof record.name === "string" && record.name) ||
    (typeof record.filename === "string" && record.filename) ||
    (typeof record.url === "string" && record.url.split("/").pop()?.split("?")[0]) ||
    "Attachment";
  const url =
    (typeof record.url === "string" && record.url) ||
    (typeof record.href === "string" && record.href) ||
    (typeof record.downloadUrl === "string" && record.downloadUrl) ||
    (typeof value === "string" ? value : null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm">📎 {name}</span>
      {url ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Download
          </a>
        </Button>
      ) : null}
    </span>
  );
}

function isFileRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return "url" in record || "filename" in record || "downloadUrl" in record || "name" in record;
}

function isFileLike(
  fieldKey: string,
  value: unknown,
  fieldType?: string,
): value is string | Record<string, unknown> {
  if (fieldType === "file") {
    if (typeof value === "string" && value.trim()) return true;
    return isFileRecord(value);
  }
  if (typeof value === "string" && looksLikeFilePath(value)) return true;
  if (isFileRecord(value)) {
    const record = value as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : "";
    return Boolean(url) && (looksLikeFilePath(url) || fieldKey.toLowerCase().includes("file") || fieldKey.toLowerCase().includes("attach") || fieldKey.toLowerCase().includes("resume"));
  }
  return false;
}

export function SubmissionFieldValue({
  fieldKey,
  value,
  fieldDef,
  className,
}: {
  fieldKey: string;
  value: unknown;
  fieldDef?: FormFieldDefinition | null;
  className?: string;
}) {
  const fieldType = fieldDef?.type;

  if (typeof value === "boolean" || fieldType === "checkbox") {
    const checked = typeof value === "boolean" ? value : Boolean(value);
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
        {checked ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" aria-hidden />
            <span>Yes</span>
          </>
        ) : (
          <>
            <X className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>No</span>
          </>
        )}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
    const asFiles = value.every((v) => isFileLike(fieldKey, v, fieldType));
    if (asFiles) {
      return (
        <ul className={cn("space-y-1", className)}>
          {value.map((v, i) => (
            <li key={i}>
              <FileValue value={v as string | Record<string, unknown>} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {value.map((v, i) => {
          const label =
            fieldDef?.options?.find((o) => o.value === String(v))?.label ?? formatScalar(v);
          return (
            <Badge key={i} variant="secondary" className="font-normal">
              {label}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (isFileLike(fieldKey, value, fieldType)) {
    return (
      <span className={className}>
        <FileValue value={value} />
      </span>
    );
  }

  if (looksLikeEmail(fieldKey, value, fieldType)) {
    const email = value.trim();
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
        <a href={`mailto:${email}`} className="text-sm text-primary hover:underline">
          {email}
        </a>
        <CopyButton text={email} />
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
          <a href={`mailto:${email}`} aria-label={`Send email to ${email}`}>
            <Mail className="h-3.5 w-3.5" />
            Send Email
          </a>
        </Button>
      </span>
    );
  }

  if (looksLikePhone(fieldKey, value, fieldType)) {
    const phone = value.trim();
    const tel = phone.replace(/\s+/g, "");
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
        <a href={`tel:${tel}`} className="text-sm hover:underline">
          {phone}
        </a>
        <CopyButton text={phone} />
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
          <a href={`tel:${tel}`} aria-label={`Call ${phone}`}>
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        </Button>
      </span>
    );
  }

  if (looksLikeUrl(fieldKey, value)) {
    const href = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-flex items-center gap-1 text-sm text-primary hover:underline break-all", className)}
      >
        {value.trim()}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    );
  }

  if (fieldType === "select" || fieldType === "radio") {
    const raw = formatScalar(value);
    const label = fieldDef?.options?.find((o) => o.value === String(value))?.label ?? raw;
    return <span className={cn("text-sm", className)}>{label}</span>;
  }

  if (fieldType === "date" && (typeof value === "string" || typeof value === "number")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return (
        <span className={cn("text-sm", className)}>
          {d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </span>
      );
    }
  }

  const formatted = formatScalar(value);
  const multiline = isMultiline(fieldKey, formatted, fieldType);

  return (
    <span
      className={cn(
        "text-sm text-foreground break-words",
        multiline && "whitespace-pre-wrap leading-relaxed block",
        className,
      )}
    >
      {formatted}
    </span>
  );
}
