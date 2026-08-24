"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";

export type ContactListItem = {
  id: string;
  icon?: string;
  title?: string;
  subtitle?: string;
  value?: string;
  url?: string;
  openNewTab?: boolean;
  showCopyBtn?: boolean;
  badge?: string;
};

type Props = {
  items: ContactListItem[];
  className?: string;
  itemClassName?: string;
};

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("contact");
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ms-auto shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={copied ? t("copied") : t("copy")}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function ContactList({ items, className, itemClassName }: Props) {
  if (!items.length) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => {
        const Icon = resolveMarketingIcon(item.icon);
        const content = (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              {item.title ? (
                <span className="block text-sm font-medium text-foreground">{item.title}</span>
              ) : null}
              {item.subtitle ? (
                <span className="block text-xs text-muted-foreground">{item.subtitle}</span>
              ) : null}
              {item.value ? (
                <span className="block text-sm text-foreground/90">{item.value}</span>
              ) : null}
            </span>
            {item.badge ? (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {item.badge}
              </span>
            ) : null}
            {item.showCopyBtn && item.value ? <CopyButton text={item.value} /> : null}
          </>
        );

        return (
          <li key={item.id}>
            {item.url ? (
              <a
                href={item.url}
                target={item.openNewTab ? "_blank" : undefined}
                rel={item.openNewTab ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-lg transition-colors hover:bg-muted/50",
                  itemClassName,
                )}
              >
                {content}
              </a>
            ) : (
              <div className={cn("flex items-start gap-3", itemClassName)}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
