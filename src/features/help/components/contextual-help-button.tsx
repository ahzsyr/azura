"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { helpRegistry } from "@/features/help/data/registry";
import { helpCenterHrefForPath } from "@/features/help/lib/resolve-contextual-topic";

export function ContextualHelpButton() {
  const pathname = usePathname();
  const href = helpCenterHrefForPath(pathname ?? "/admin", helpRegistry);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Help for this page">
          <Link href={href}>
            <CircleHelp className="h-4 w-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Help for this page</TooltipContent>
    </Tooltip>
  );
}
