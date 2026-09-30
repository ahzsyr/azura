"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listFooterPlugins } from "@/features/footer/sections/registry";
import { resolveSectionIcon } from "@/features/footer/sections/section-icons";
import type { FooterSectionType } from "@/features/footer/sections/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: FooterSectionType) => void;
};

export function AddFooterSectionDialog({ open, onOpenChange, onSelect }: Props) {
  const plugins = listFooterPlugins();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add footer section</DialogTitle>
          <DialogDescription>Choose a section type. Defaults come from the section preset.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2 sm:grid-cols-2">
          {plugins.map((plugin) => {
            const Icon = resolveSectionIcon(plugin.icon);
            return (
              <li key={plugin.type}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    "hover:border-primary hover:bg-muted/50",
                  )}
                  onClick={() => {
                    onSelect(plugin.type);
                    onOpenChange(false);
                  }}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">{plugin.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{plugin.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
