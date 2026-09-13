"use client";

import {
  AlignLeft,
  Building2,
  Clock,
  Code,
  CreditCard,
  FileText,
  Handshake,
  Image,
  Mail,
  Menu,
  Phone,
  Scale,
  Share2,
  Shield,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { FooterSectionType } from "../types";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Menu,
  Phone,
  Share2,
  AlignLeft,
  Scale,
  Mail,
  CreditCard,
  Shield,
  Clock,
  Smartphone,
  Image,
  Handshake,
  FileText,
  Code,
};

export function resolveSectionIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? AlignLeft;
}

export function sectionSummary(type: FooterSectionType, column: { title?: string; links?: unknown[]; body?: string }): string {
  if (type === "brand") return "Uses Theme identity";
  if (column.links?.length) return `${column.links.length} link${column.links.length === 1 ? "" : "s"}`;
  if (column.body?.trim()) return column.body.trim().slice(0, 48) + (column.body.length > 48 ? "…" : "");
  return "";
}
