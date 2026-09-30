"use client";

import { DEPLOYMENT_PROFILE_IDS } from "@/config/deployment-profile/types";
import { getActiveProfileId } from "@/config/deployment-profile";
import { cn } from "@/lib/utils";
import type { DeploymentProfileId } from "@/config/deployment-profile/types";

const LABELS: Record<DeploymentProfileId, string> = {
  marketing: "Marketing",
  showroom: "Showroom",
  agency: "Agency",
  tourism: "Tourism",
  documentation: "Documentation",
  enterprise: "Enterprise",
};

export function HelpAppliesTo({
  appliesToProfiles,
  className,
}: {
  appliesToProfiles?: DeploymentProfileId[];
  className?: string;
}) {
  if (!appliesToProfiles?.length) return null;
  const current = getActiveProfileId();
  const declared = new Set(appliesToProfiles);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">Applies to</p>
      <ul className="flex flex-wrap gap-2 text-xs">
        {DEPLOYMENT_PROFILE_IDS.map((id) => {
          const ok = declared.has(id);
          return (
            <li
              key={id}
              className={cn(
                "rounded-md border px-2 py-0.5",
                ok ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground/70",
                id === current && "ring-1 ring-primary/40"
              )}
            >
              {ok ? "✓" : "✗"} {LABELS[id]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
