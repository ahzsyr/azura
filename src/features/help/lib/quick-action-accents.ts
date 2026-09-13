import type { LucideIcon } from "lucide-react";
import {
  FileText,
  FormInput,
  Globe2,
  Languages,
  Mail,
  Package,
  Palette,
  Rocket,
  Search,
} from "lucide-react";

export type HelpAccent = {
  icon: LucideIcon;
  tileClass: string;
  iconClass: string;
};

const DEFAULT_ACCENT: HelpAccent = {
  icon: Rocket,
  tileClass: "border-border bg-muted/30 hover:bg-muted/50",
  iconClass: "text-muted-foreground",
};

const BY_WORKFLOW_ID: Record<string, HelpAccent> = {
  "workflow-launch-website": {
    icon: Rocket,
    tileClass: "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15",
    iconClass: "text-amber-700 dark:text-amber-300",
  },
  "workflow-first-setup": {
    icon: Rocket,
    tileClass: "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15",
    iconClass: "text-amber-700 dark:text-amber-300",
  },
  "workflow-create-page": {
    icon: FileText,
    tileClass: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15",
    iconClass: "text-emerald-700 dark:text-emerald-300",
  },
  "workflow-add-products": {
    icon: Package,
    tileClass: "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15",
    iconClass: "text-violet-700 dark:text-violet-300",
  },
  "workflow-customize-design": {
    icon: Palette,
    tileClass: "border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/15",
    iconClass: "text-pink-700 dark:text-pink-300",
  },
  "workflow-configure-forms": {
    icon: FormInput,
    tileClass: "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15",
    iconClass: "text-orange-700 dark:text-orange-300",
  },
  "workflow-enable-languages": {
    icon: Languages,
    tileClass: "border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15",
    iconClass: "text-yellow-700 dark:text-yellow-300",
  },
  "workflow-seo-setup": {
    icon: Search,
    tileClass: "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15",
    iconClass: "text-sky-700 dark:text-sky-300",
  },
  "workflow-configure-email": {
    icon: Mail,
    tileClass: "border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/15",
    iconClass: "text-slate-700 dark:text-slate-300",
  },
};

export function getWorkflowAccent(workflowId: string): HelpAccent {
  return BY_WORKFLOW_ID[workflowId] ?? { ...DEFAULT_ACCENT, icon: Globe2 };
}
