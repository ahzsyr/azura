"use client";

import { CircleHelp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { helpRegistry } from "@/features/help/data/registry";
import { readRecentTopicIds } from "@/features/help/lib/help-persistence";
import { resolvePanelTopicId } from "@/features/help/lib/resolve-contextual-topic";
import { useHelpPanelStore } from "@/stores/help-panel-store";
import { cn } from "@/lib/utils";

function panelTopicIdForPath(pathname: string): string | null {
  const contextual = resolvePanelTopicId(pathname, helpRegistry);
  if (contextual) return contextual;

  const recent = readRecentTopicIds().find((id) => helpRegistry.topicsById.has(id));
  return recent ?? null;
}

type ContextualHelpButtonProps = {
  variant?: "toolbar" | "fab";
  className?: string;
};

export function ContextualHelpButton({ variant = "toolbar", className }: ContextualHelpButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const openTopic = useHelpPanelStore((s) => s.openTopic);

  const handleClick = () => {
    const topicId = panelTopicIdForPath(pathname ?? "/admin");
    if (topicId) {
      openTopic(topicId);
      return;
    }
    router.push("/admin/help");
  };

  const isFab = variant === "fab";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isFab ? "outline" : "ghost"}
          size="icon"
          className={cn(
            isFab
              ? "h-11 w-11 rounded-full border-border/70 bg-background/90 shadow-lg backdrop-blur-md"
              : "h-8 w-8",
            className,
          )}
          aria-label="Help for this page"
          onClick={handleClick}
        >
          <CircleHelp className={isFab ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={isFab ? "left" : "bottom"}>Help for this page</TooltipContent>
    </Tooltip>
  );
}
