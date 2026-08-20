"use client";

import { useRef } from "react";
import { HelpTaskCard } from "@/features/help/components/help-task-card";
import {
  inferTopicStatus,
  resolvePrimaryTopicLink,
} from "@/features/help/lib/topic-status";
import type { HelpSection } from "@/features/help/types";
import { cn } from "@/lib/utils";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";

export function HelpCategoryBrowser({
  sections,
  activeSectionId,
  onSelectSection,
  highlightedTopicId,
  onViewGuide,
  categoryListRef,
}: {
  sections: HelpSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  highlightedTopicId: string | null;
  onViewGuide: (topicId: string) => void;
  categoryListRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const active = sections.find((s) => s.id === activeSectionId) ?? sections[0];
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  if (!sections.length || !active) return null;

  const onCategoryKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const nextIndex =
      e.key === "ArrowDown"
        ? Math.min(index + 1, sections.length - 1)
        : Math.max(index - 1, 0);
    const next = sections[nextIndex];
    if (!next) return;
    onSelectSection(next.id);
    chipRefs.current.get(next.id)?.focus();
  };

  const topicGrid = (
    <div className="grid gap-3 md:grid-cols-2">
      {active.topics.map((topic) => {
        const link = resolvePrimaryTopicLink(topic);
        return (
          <HelpTaskCard
            key={topic.id}
            id={topic.id}
            title={topic.title}
            summary={topic.summary}
            readingTime={topic.readingTime}
            difficulty={topic.difficulty}
            status={inferTopicStatus(topic)}
            primaryHref={link?.href}
            primaryLabel={link?.label}
            highlighted={highlightedTopicId === topic.id}
            onViewGuide={() => onViewGuide(topic.id)}
          />
        );
      })}
    </div>
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Browse guides</h2>

      {/* Desktop / tablet split */}
      <div className="hidden gap-6 md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
        <nav
          ref={categoryListRef}
          className="space-y-1 lg:sticky lg:top-16 lg:self-start"
          aria-label="Help categories"
        >
          {sections.map((section, index) => {
            const Icon = section.icon;
            const selected = section.id === active.id;
            return (
              <button
                key={section.id}
                type="button"
                ref={(el) => {
                  if (el) chipRefs.current.set(section.id, el);
                  else chipRefs.current.delete(section.id);
                }}
                onClick={() => onSelectSection(section.id)}
                onKeyDown={(e) => onCategoryKeyDown(e, index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                  selected ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                )}
                aria-current={selected ? "page" : undefined}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                <span className="truncate">{section.title}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="font-medium">{active.title}</h3>
            {active.description && (
              <p className="text-sm text-muted-foreground">{active.description}</p>
            )}
          </div>
          {topicGrid}
        </div>
      </div>

      {/* Mobile accordion */}
      <div className="space-y-3 md:hidden">
        {sections.map((section) => (
          <AdminCollapsibleSection
            key={section.id}
            title={section.title}
            description={section.description}
            defaultOpen={section.id === active.id}
          >
            <div className="grid gap-3 pt-2">
              {section.topics.map((topic) => {
                const link = resolvePrimaryTopicLink(topic);
                return (
                  <HelpTaskCard
                    key={topic.id}
                    id={topic.id}
                    title={topic.title}
                    summary={topic.summary}
                    readingTime={topic.readingTime}
                    difficulty={topic.difficulty}
                    status={inferTopicStatus(topic)}
                    primaryHref={link?.href}
                    primaryLabel={link?.label}
                    highlighted={highlightedTopicId === topic.id}
                    onViewGuide={() => {
                      onSelectSection(section.id);
                      onViewGuide(topic.id);
                    }}
                  />
                );
              })}
            </div>
          </AdminCollapsibleSection>
        ))}
      </div>
    </section>
  );
}
