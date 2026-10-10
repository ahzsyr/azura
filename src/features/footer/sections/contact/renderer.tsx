import { Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { FooterContactItem, FooterContactItemType } from "../../types";
import type { SectionRenderProps } from "../types";
import { ContactItemIcon } from "./contact-item-icon";

function isRichText(type: FooterContactItemType): boolean {
  return type === "richtext" || type === "custom";
}

function contactHref(item: FooterContactItem): string {
  const explicit = item.url?.trim() ?? "";
  if (explicit) return explicit;
  const value = item.value.trim();
  if (!value) return "";
  if (item.type === "phone") return value.startsWith("tel:") ? value : `tel:${value.replace(/\s+/g, "")}`;
  if (item.type === "email") return value.startsWith("mailto:") ? value : `mailto:${value}`;
  return "";
}

export function ContactRenderer({ column: col, ctx }: SectionRenderProps) {
  const { company, address, headingClass } = ctx;
  const customItems = (col.customContactItems ?? []).filter(
    (item) => item.label?.trim() || item.value?.trim(),
  );

  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul className="space-y-3 text-sm text-background/70">
        {col.showPhone && company?.phone ? (
          <li className="flex items-center gap-2 justify-start">
            <Phone className="h-4 w-4 shrink-0 text-accent" />
            {company.phone}
          </li>
        ) : null}
        {col.showEmail && company?.email ? (
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-accent" />
            {company.email}
          </li>
        ) : null}
        {col.showAddress && address ? (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {address}
          </li>
        ) : null}

        {customItems.map((item) => (
          <ContactItemRenderer key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function ContactItemRenderer({ item }: { item: FooterContactItem }) {
  const href = isRichText(item.type) || item.type === "text" ? "" : contactHref(item);
  const body = (
    <>
      <ContactItemIcon
        icon={item.icon}
        type={item.type}
        className={cn("h-4 w-4 shrink-0 text-accent", isRichText(item.type) || item.type === "address" ? "mt-0.5" : undefined)}
      />
      <div className="min-w-0 flex-1">
        {item.label?.trim() && !isRichText(item.type) ? (
          <span className="font-medium">{item.label.trim()}: </span>
        ) : null}
        {isRichText(item.type) ? (
          <div className="prose prose-invert prose-sm max-w-none">
            {item.label?.trim() ? <p className="mb-1 font-medium not-prose">{item.label.trim()}</p> : null}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.value) }} />
          </div>
        ) : (
          <span className="whitespace-pre-line">{item.value}</span>
        )}
        {item.badge?.trim() ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
            {item.badge.trim()}
          </span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <li>
        <a
          href={href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          className="flex items-start gap-2 transition-colors hover:text-accent"
        >
          {body}
        </a>
      </li>
    );
  }

  return <li className="flex items-start gap-2">{body}</li>;
}
