import type { TranslationStatus } from "@prisma/client";

export type MessageSemanticRole = "aria" | "heading" | "body" | "button" | "general";

export type MessageCellState = "missing" | "draft" | "published-override" | "file-fallback";

export type MessageEditorKind = "input" | "textarea";

export type MessageEditorConfig = {
  kind: MessageEditorKind;
  rows: number;
};

const ROLE_LABELS: Record<MessageSemanticRole, string> = {
  aria: "Aria",
  heading: "Heading",
  body: "Body",
  button: "Button",
  general: "General",
};

export function getMessageGroup(fullKey: string): string {
  const segment = fullKey.split(".")[0];
  return segment || "root";
}

export function inferMessageRole(fullKey: string): MessageSemanticRole {
  const lower = fullKey.toLowerCase();
  const segments = lower.split(".");
  const last = segments[segments.length - 1] ?? "";

  if (last.includes("aria") || lower.includes("accessibility")) return "aria";
  if (
    last === "title" ||
    last === "heading" ||
    last === "badge" ||
    last.endsWith("title") ||
    last.endsWith("heading")
  ) {
    return "heading";
  }
  if (
    last === "subtitle" ||
    last === "desc" ||
    last === "description" ||
    last.endsWith("subtitle") ||
    last.endsWith("description") ||
    last.endsWith("desc")
  ) {
    return "body";
  }
  if (
    last === "cta" ||
    last === "button" ||
    last === "label" ||
    last === "inquire" ||
    last.endsWith("cta") ||
    last.endsWith("button") ||
    last.endsWith("label")
  ) {
    return "button";
  }
  return "general";
}

export function getRoleLabel(role: MessageSemanticRole): string {
  return ROLE_LABELS[role];
}

export function getEditorConfig(role: MessageSemanticRole, value: string): MessageEditorConfig {
  if (role === "body" || value.length >= 100) {
    return { kind: "textarea", rows: 3 };
  }
  return { kind: "input", rows: 1 };
}

export function resolveCellState(args: {
  localeCode: string;
  englishValue: string;
  dbValue: string | undefined;
  dbStatus: TranslationStatus | undefined;
  fileFallback: string;
}): MessageCellState {
  const { localeCode, englishValue, dbValue, dbStatus, fileFallback } = args;
  const hasDb = Boolean(dbValue?.trim());
  const hasFile = Boolean(String(fileFallback ?? "").trim());

  if (hasDb) {
    return dbStatus === "DRAFT" ? "draft" : "published-override";
  }

  if (localeCode !== "en" && englishValue.trim() && !hasFile) {
    return "missing";
  }

  if (hasFile) {
    return "file-fallback";
  }

  return "file-fallback";
}

export function getCellStateClass(state: MessageCellState): string {
  switch (state) {
    case "missing":
      return "bg-destructive/5";
    case "draft":
      return "bg-amber-500/5";
    case "published-override":
      return "bg-primary/5";
    case "file-fallback":
      return "border border-dashed border-muted-foreground/20";
  }
}

export const ALL_MESSAGE_ROLES: MessageSemanticRole[] = [
  "aria",
  "heading",
  "body",
  "button",
  "general",
];

export type StatusFilter = "all" | "missing" | "draft" | "published";
