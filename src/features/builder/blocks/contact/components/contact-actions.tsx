"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ContactIcon } from "./contact-icon";

export type ContactActionItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "link";
  external?: boolean;
  primary?: boolean;
};

type Props = {
  actions: ContactActionItem[];
  className?: string;
  children?: ReactNode;
  layout?: "row" | "stack" | "grid";
  styleVariant?: "ghost" | "outline" | "filled" | "links";
  size?: "sm" | "default";
};

function resolveVariant(
  action: ContactActionItem,
  styleVariant: NonNullable<Props["styleVariant"]>,
): ContactActionItem["variant"] {
  if (action.variant) return action.variant;
  if (styleVariant === "links") return "link";
  if (styleVariant === "filled") return action.primary ? "default" : "secondary";
  if (styleVariant === "ghost") return "ghost";
  return "outline";
}

export function ContactActions({
  actions,
  className,
  children,
  layout = "row",
  styleVariant = "outline",
  size = "sm",
}: Props) {
  if (!actions.length && !children) return null;

  const isTile = layout === "grid" || layout === "stack";
  const useTiles = isTile && styleVariant !== "links";

  const layoutClass =
    layout === "stack"
      ? "flex flex-col items-stretch gap-2"
      : layout === "grid"
        ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
        : "flex flex-wrap items-center gap-2";

  return (
    <div className={cn(layoutClass, className)}>
      {actions.map((action) => {
        const variant = resolveVariant(action, styleVariant);
        const key = action.label + (action.href ?? "");

        if (useTiles) {
          const tileClass = cn(
            "group relative flex h-auto min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-sm font-medium transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            action.primary
              ? "border-primary/25 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
              : "border-border/80 bg-background/90 text-foreground hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-background hover:shadow-sm",
            styleVariant === "ghost" &&
              !action.primary &&
              "border-transparent bg-background/50 hover:bg-background",
            styleVariant === "filled" &&
              !action.primary &&
              "border-transparent bg-foreground/5 hover:bg-foreground/10",
          );

          const tileContent = (
            <>
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  action.primary
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-foreground/80 group-hover:bg-muted/80",
                )}
              >
                {action.icon ? <ContactIcon name={action.icon} size="sm" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate leading-snug">{action.label}</span>
              {action.external ? (
                <ExternalLink
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-80",
                    action.primary && "opacity-70",
                  )}
                />
              ) : null}
            </>
          );

          if (action.href) {
            return (
              <a
                key={key}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
                className={tileClass}
              >
                {tileContent}
              </a>
            );
          }

          return (
            <button key={key} type="button" onClick={action.onClick} className={tileClass}>
              {tileContent}
            </button>
          );
        }

        const content = (
          <>
            {action.icon ? <ContactIcon name={action.icon} size="sm" /> : null}
            <span className="truncate">{action.label}</span>
            {action.external && styleVariant !== "links" ? (
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : null}
          </>
        );

        if (action.href) {
          return (
            <Button
              key={key}
              asChild
              variant={variant}
              size={size}
              className={cn(layout === "stack" && "justify-start", action.primary && "font-semibold")}
            >
              <a
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1.5"
              >
                {content}
              </a>
            </Button>
          );
        }

        return (
          <Button
            key={key}
            type="button"
            variant={variant}
            size={size}
            onClick={action.onClick}
            className={cn(
              "inline-flex items-center gap-1.5",
              layout === "stack" && "justify-start",
            )}
          >
            {content}
          </Button>
        );
      })}
      {children}
    </div>
  );
}
