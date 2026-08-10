"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpHero } from "@/features/help/components/help-hero";
import { HelpSearchResults } from "@/features/help/components/help-search";
import { HelpQuickActions } from "@/features/help/components/help-quick-actions";
import { HelpRecentGuides } from "@/features/help/components/help-recent-guides";
import { HelpCategoryBrowser } from "@/features/help/components/help-category-browser";
import { HelpChecklistView } from "@/features/help/components/help-checklist";
import { HelpFaqList, HelpTroubleshootingList } from "@/features/help/components/help-troubleshooting";
import { HelpSystemInfo } from "@/features/help/components/help-system-info";
import { HelpTopicDetailSheet } from "@/features/help/components/help-topic-detail-sheet";
import { useHelpSearch } from "@/features/help/hooks/use-help-search";
import { useHelpAnalytics } from "@/features/help/hooks/use-help-analytics";
import { useHelpContinue } from "@/features/help/hooks/use-help-continue";
import { useHelpRecentTopics } from "@/features/help/hooks/use-help-recent-topics";
import { useActiveHelpSection } from "@/features/help/hooks/use-active-help-section";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpSearchHit, HelpSystemDiagnostics, HelpTopic, HelpWorkflow } from "@/features/help/types";

function readHashId(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  return hash || null;
}

function popularWorkflows(workflows: HelpWorkflow[]): HelpWorkflow[] {
  const scored = [...workflows].sort((a, b) => {
    const score = (w: HelpWorkflow) => {
      let s = 0;
      if (w.badges?.includes("launch-required")) s += 3;
      if (w.badges?.includes("recommended")) s += 2;
      if (w.badges?.includes("required")) s += 1;
      return s;
    };
    return score(b) - score(a);
  });
  return scored.slice(0, 4);
}

export function HelpCenterClient({ diagnostics }: { diagnostics: HelpSystemDiagnostics }) {
  const { query, setQuery, hits, view } = useHelpSearch();
  const { track } = useHelpAnalytics();
  const [hashId, setHashId] = useState<string | null>(null);
  const [detailTopicId, setDetailTopicId] = useState<string | null>(null);
  const focusReturnId = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const continueSetup = useHelpContinue(view.checklists);
  const sectionIds = useMemo(() => view.sections.map((s) => s.id), [view.sections]);
  const { activeSectionId, setActiveSectionId } = useActiveHelpSection(sectionIds, hashId);

  const availableTopicIds = useMemo(() => {
    const set = new Set<string>();
    for (const section of view.sections) {
      for (const topic of section.topics) set.add(topic.id);
    }
    return set;
  }, [view.sections]);

  const { topics: recentTopics, record: recordRecent } = useHelpRecentTopics(availableTopicIds);

  const activeSection = view.sections.find((s) => s.id === activeSectionId) ?? view.sections[0];
  const sectionTopicIds = activeSection?.topics.map((t) => t.id) ?? [];
  const detailTopic: HelpTopic | null = detailTopicId
    ? (helpRegistry.topicsById.get(detailTopicId) ?? null)
    : null;

  useEffect(() => {
    track({ name: "help_opened" });
  }, [track]);

  useEffect(() => {
    const syncHash = () => {
      const id = readHashId();
      setHashId(id);
      if (!id) return;
      if (helpRegistry.topicsById.has(id)) {
        setDetailTopicId(id);
        recordRecent(id);
        track({ name: "help_topic_viewed", topicId: id });
      }
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        document
          .getElementById(`topic-card-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [recordRecent, track]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (e.key === "/" && !editable) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape" && detailTopicId) {
        setDetailTopicId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailTopicId]);

  const openTopicGuide = useCallback(
    (topicId: string) => {
      const sectionId = helpRegistry.topicSectionId.get(topicId);
      if (sectionId) setActiveSectionId(sectionId);
      focusReturnId.current = topicId;
      setDetailTopicId(topicId);
      recordRecent(topicId);
      track({ name: "help_topic_viewed", topicId });
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${topicId}`);
        setHashId(topicId);
      }
    },
    [recordRecent, setActiveSectionId, track]
  );

  const restoreFocus = useCallback(() => {
    const id = focusReturnId.current;
    if (!id) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`topic-card-${id}`) as HTMLElement | null;
      el?.focus();
    });
  }, []);

  const openWorkflow = useCallback(
    (workflow: HelpWorkflow) => {
      track({ name: "workflow_started", workflowId: workflow.id });
      const topicStep = workflow.steps.find((s) => s.type === "topic");
      if (topicStep && topicStep.type === "topic") {
        openTopicGuide(topicStep.topicId);
        return;
      }
      const checklistStep = workflow.steps.find((s) => s.type === "checklist");
      if (checklistStep && checklistStep.type === "checklist") {
        setActiveSectionId("section-getting-started");
        window.location.hash = checklistStep.checklistId;
        document
          .getElementById(checklistStep.checklistId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [openTopicGuide, setActiveSectionId, track]
  );

  const onContinue = useCallback(() => {
    if (!continueSetup) return;
    setActiveSectionId("section-getting-started");
    window.location.hash = continueSetup.checklist.id;
    document
      .getElementById(continueSetup.checklist.id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [continueSetup, setActiveSectionId]);

  const openHit = useCallback(
    (hit: HelpSearchHit) => {
      if (hit.kind === "topic") {
        openTopicGuide(hit.id);
        setQuery("");
        return;
      }
      if (hit.kind === "section") {
        setActiveSectionId(hit.id);
        setQuery("");
        return;
      }
      if (hit.kind === "workflow") {
        const workflow = helpRegistry.workflowsById.get(hit.id);
        if (workflow) openWorkflow(workflow);
        setQuery("");
        return;
      }
      setQuery("");
      window.location.hash = hit.id;
      requestAnimationFrame(() => {
        document.getElementById(hit.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [openTopicGuide, openWorkflow, setActiveSectionId, setQuery]
  );

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim()) {
        track({ name: "help_search", queryLength: value.trim().length });
      }
    },
    [setQuery, track]
  );

  const searching = query.trim().length > 0;
  const popular = useMemo(() => popularWorkflows(view.workflows), [view.workflows]);

  return (
    <div className="flex flex-col gap-12 pb-8 md:gap-16">
      <HelpHero
        query={query}
        onQueryChange={onQueryChange}
        searchInputRef={searchInputRef}
        continueSetup={continueSetup}
        onContinue={onContinue}
        popularWorkflows={popular}
        onOpenWorkflow={openWorkflow}
      />

      {searching ? (
        <HelpSearchResults hits={hits} onOpenHit={openHit} />
      ) : (
        <>
          <HelpQuickActions workflows={view.workflows} onOpenWorkflow={openWorkflow} />

          <HelpRecentGuides topics={recentTopics} onOpenTopic={openTopicGuide} />

          <HelpCategoryBrowser
            sections={view.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            highlightedTopicId={detailTopicId}
            onViewGuide={openTopicGuide}
          />

          <section id="section-checklists" className="space-y-4 scroll-mt-24">
            <h2 className="text-lg font-medium">Launch Checklists</h2>
            <div className="space-y-3">
              {view.checklists.map((checklist) => (
                <HelpChecklistView key={checklist.id} checklistId={checklist.id} />
              ))}
            </div>
          </section>

          <HelpTroubleshootingList items={view.troubleshooting} />
          <HelpFaqList faqs={view.faqs} />
          <HelpSystemInfo initial={diagnostics} />
        </>
      )}

      <HelpTopicDetailSheet
        topic={detailTopic}
        sectionTopicIds={sectionTopicIds}
        open={Boolean(detailTopic)}
        onOpenChange={(open) => {
          if (!open) setDetailTopicId(null);
        }}
        onNavigateTopic={openTopicGuide}
        onCloseFocus={restoreFocus}
      />
    </div>
  );
}
