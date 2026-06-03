"use client";

import {
  Layout,
  Type,
  Image,
  Images,
  HelpCircle,
  Star,
  DollarSign,
  Megaphone,
  Video,
  FileText,
  Package,
  Hotel,
  Code,
  MoveVertical,
  Minus,
  Box,
  LayoutGrid,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  layout: Layout,
  type: Type,
  image: Image,
  images: Images,
  "help-circle": HelpCircle,
  star: Star,
  "dollar-sign": DollarSign,
  megaphone: Megaphone,
  video: Video,
  "file-text": FileText,
  package: Package,
  hotel: Hotel,
  code: Code,
  "move-vertical": MoveVertical,
  minus: Minus,
  box: Box,
  "layout-grid": LayoutGrid,
  mail: Mail,
};

type Props = {
  icon: string;
  className?: string;
};

export function BlockTypeIcon({ icon, className }: Props) {
  const Icon = ICON_MAP[icon] ?? Box;
  return <Icon className={cn("h-5 w-5", className)} />;
}
