"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FxsSectionConfig } from "../types";
import { useFxsTheme } from "./ThemeProvider";
import { prefersReducedMotion } from "../a11y/motion";

type AccordionGroupContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(null);

/** When true, FieldWrapper instances collapse individually instead of the section card. */
const CollapsibleFieldsContext = createContext(false);

export function useCollapsibleFields(): boolean {
  return useContext(CollapsibleFieldsContext);
}

export function AccordionGroup({
  defaultOpenId,
  children,
}: {
  defaultOpenId?: string | null;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const value = useMemo(() => ({ openId, setOpenId }), [openId]);
  return <AccordionGroupContext.Provider value={value}>{children}</AccordionGroupContext.Provider>;
}

function resolveSectionSurface(style: FxsSectionConfig["style"] | "soft" | undefined) {
  switch (style) {
    case "flat":
      return "fxs-section--flat border-transparent bg-transparent p-0 shadow-none";
    case "bordered":
      return "fxs-section--bordered border-border/70 bg-transparent shadow-none";
    case "filled":
      return "fxs-section--filled border-transparent bg-[var(--fxs-surface-muted)]/70 shadow-none";
    case "collapsible":
    case "accordion":
    case "soft":
      return "border-border/60 bg-[var(--fxs-surface-muted)]/40 p-5 shadow-[var(--fxs-elev-sm)] sm:p-6";
    case "card":
    default:
      return "border-border/70 bg-[var(--fxs-surface)] p-5 shadow-[var(--fxs-elev-sm)] sm:p-6";
  }
}

export function FormSectionCard({
  config,
  errors,
  children,
  className,
  animate = true,
}: {
  config: FxsSectionConfig;
  errors?: Record<string, string>;
  children: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const { theme } = useFxsTheme();
  const accordion = config.style === "accordion";
  const accordionGroup = useContext(AccordionGroupContext);
  const resolvedStyle = config.style ?? theme.sectionStyle ?? "card";
  // "collapsible" style = per-field collapse; section toggle only for accordion / explicit flag
  const fieldCollapsible = resolvedStyle === "collapsible";
  const sectionCollapsible =
    !fieldCollapsible && (config.collapsible === true || accordion || resolvedStyle === "accordion");
  const hasErrors = Boolean(config.fieldIds?.some((fieldId) => errors?.[fieldId]));
  const [localOpen, setLocalOpen] = useState(hasErrors || config.defaultOpen !== false);
  const reduced = prefersReducedMotion();
  const open = accordion && accordionGroup ? accordionGroup.openId === config.id : localOpen;

  useEffect(() => {
    if (hasErrors) {
      if (accordion && accordionGroup) accordionGroup.setOpenId(config.id);
      else setLocalOpen(true);
    }
  }, [accordion, accordionGroup, config.id, hasErrors]);

  const toggle = () => {
    if (!sectionCollapsible) return;
    if (accordion && accordionGroup) {
      accordionGroup.setOpenId(open ? null : config.id);
      return;
    }
    setLocalOpen((value) => !value);
  };

  const surfaceStyle = fieldCollapsible ? "card" : resolvedStyle;

  const body = (
    <section
      id={config.id}
      aria-labelledby={config.title ? `${config.id}-title` : undefined}
      className={cn(
        "rounded-[var(--schema-radius-lg)] border transition-shadow",
        resolveSectionSurface(surfaceStyle === "card" && fieldCollapsible ? "collapsible" : surfaceStyle),
        animate && !reduced && "fxs-section-enter",
        className,
      )}
      style={{ transitionDuration: "var(--fxs-motion, 160ms)" }}
    >
      {(config.title || config.description || config.icon) && (
        <div className={cn("mb-4 flex items-start justify-between gap-3", sectionCollapsible && "cursor-pointer")}
          onClick={sectionCollapsible ? toggle : undefined}
          onKeyDown={
            sectionCollapsible
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }
              : undefined
          }
          role={sectionCollapsible ? "button" : undefined}
          tabIndex={sectionCollapsible ? 0 : undefined}
          aria-expanded={sectionCollapsible ? open : undefined}
        >
          <div className="min-w-0 space-y-1">
            {config.title ? (
              <h3
                id={`${config.id}-title`}
                className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground sm:text-base"
              >
                {config.icon}
                {config.title}
              </h3>
            ) : null}
            {config.description ? (
              <p className="text-xs text-muted-foreground sm:text-sm">{config.description}</p>
            ) : null}
          </div>
          {sectionCollapsible ? (
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          ) : null}
        </div>
      )}
      <div
        className={cn("fxs-collapse-content", sectionCollapsible && "fxs-collapse-content--animated")}
        data-open={open || !sectionCollapsible}
      >
        <div className="min-h-0 space-y-[var(--schema-space-md)]">{children}</div>
      </div>
    </section>
  );

  if (!fieldCollapsible) return body;
  return (
    <CollapsibleFieldsContext.Provider value={true}>{body}</CollapsibleFieldsContext.Provider>
  );
}

/** Resolves section → cards → rows → columns → fields without mutating schema. */
export type FieldWidth = "auto" | "sm" | "md" | "lg" | "full" | "half" | "third" | "quarter";
export type LayoutColumn = { id: string; span?: number; width?: FieldWidth; hidden?: boolean; children: ReactNode };
export type LayoutRow = { id: string; columns: LayoutColumn[]; hidden?: boolean };
export type LayoutSection = {
  id: string;
  title?: string;
  description?: string;
  style?: FxsSectionConfig["style"];
  fieldIds?: string[];
  rows: LayoutRow[];
  hidden?: boolean;
};

function fieldWidthToSpan(width?: FieldWidth): number {
  switch (width) {
    case "sm": return 3;
    case "md": return 4;
    case "lg": return 8;
    case "full": return 12;
    case "half": return 6;
    case "third": return 4;
    case "quarter": return 3;
    default: return 12;
  }
}

export function LayoutEngine({
  sections,
  errors,
  className,
}: {
  sections: LayoutSection[];
  errors?: Record<string, string>;
  className?: string;
}) {
  const visibleSections = sections.filter((s) => !s.hidden);
  const hasAccordion = visibleSections.some((section) => section.style === "accordion");

  const content = (
    <div className={cn("space-y-[var(--schema-space-lg)]", className)} data-fxs-layout-engine>
      {visibleSections.map((section) => (
        <FormSectionCard
          key={section.id}
          errors={errors}
          config={{
            id: section.id,
            title: section.title,
            description: section.description,
            style: section.style,
            fieldIds: section.fieldIds,
          }}
        >
          {section.rows.filter((r) => !r.hidden).map((row) => (
            <div
              key={row.id}
              className="grid gap-[var(--schema-space-md)] sm:grid-cols-12"
            >
              {row.columns.filter((c) => !c.hidden).map((col) => {
                const span = col.span ?? fieldWidthToSpan(col.width);
                return (
                  <div
                    key={col.id}
                    className="min-w-0"
                    style={{ gridColumn: `span ${Math.min(12, Math.max(1, span))} / span ${Math.min(12, Math.max(1, span))}` }}
                  >
                    {col.children}
                  </div>
                );
              })}
            </div>
          ))}
        </FormSectionCard>
      ))}
    </div>
  );

  if (!hasAccordion) return content;
  return <AccordionGroup defaultOpenId={visibleSections[0]?.id}>{content}</AccordionGroup>;
}
