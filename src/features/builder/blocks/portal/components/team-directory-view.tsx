"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import {
  portalAllLabel,
  portalSearchPlaceholder,
} from "@/features/builder/blocks/portal/lib/portal-ui-labels";
import type { TeamDirectoryPublic } from "@/presets/team-member/types";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import type { TeamDepartmentView } from "@/presets/team-member/resolve-team-members-for-block";
import { resolveMemberCardFromSearchHit } from "@/presets/team-member/resolve-member-from-search-hit";
import { MemberCardTemplate } from "@/templates/team-member/member-card-template";
import Image from "next/image";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  layout?: "grid" | "list";
  showSearch?: boolean;
  showDepartments?: boolean;
  teamDirectorySlug?: string;
  departments?: TeamDepartmentView[];
  memberViewModels?: TeamMemberCardViewModel[];
  /** Legacy fallback during migration. */
  directory?: TeamDirectoryPublic;
};

export function TeamDirectoryView({
  locale,
  title,
  subtitle,
  layout = "grid",
  showSearch = true,
  showDepartments = true,
  teamDirectorySlug,
  departments = [],
  memberViewModels,
  directory,
}: Props) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TeamMemberCardViewModel[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const useViewModels = memberViewModels !== undefined;
  const useSearchApi = showSearch && !!teamDirectorySlug && useViewModels;

  useEffect(() => {
    if (!useSearchApi) {
      setSearchResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const facets: Record<string, string[]> = {};
        if (departmentId) facets.departmentId = [departmentId];
        const params = new URLSearchParams({
          locale,
          kinds: "team_member",
          scope: teamDirectorySlug,
          q: query.trim(),
          limit: "80",
        });
        if (Object.keys(facets).length) {
          params.set("facets", JSON.stringify(facets));
        }
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          results: Array<{
            entityId: string;
            facets?: Record<string, string | string[] | number | boolean>;
            card?: Record<string, unknown>;
          }>;
        };
        setSearchResults(
          data.results.map((hit) => resolveMemberCardFromSearchHit(hit, teamDirectorySlug)),
        );
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [useSearchApi, query, departmentId, teamDirectorySlug, locale]);

  const legacyMembers = useMemo(() => {
    if (!directory) return [];
    const q = query.trim().toLowerCase();
    return directory.members.filter((m) => {
      if (departmentId && m.departmentId !== departmentId) return false;
      if (!q) return true;
      const name = pickLocale(m, "name", locale).toLowerCase();
      const role = pickLocale(m, "role", locale).toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [directory, departmentId, query, locale]);

  const departmentFilteredViewModels = useMemo(() => {
    if (!memberViewModels) return [];
    if (!departmentId) return memberViewModels;
    return memberViewModels.filter((vm) => vm.departmentId === departmentId);
  }, [memberViewModels, departmentId]);

  const displayViewModels = useSearchApi
    ? (searchResults ?? [])
    : departmentFilteredViewModels;

  const displayDepartments = useViewModels
    ? departments
    : (directory?.departments ?? []).map((d) => ({ id: d.id, name: pickLocale(d, "name", locale) }));

  const memberCount = useViewModels ? displayViewModels.length : legacyMembers.length;

  return (
    <div className={cn("pb-team", `pb-team--${layout}`)}>
      {title && <h2 className="pb-team__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-team__subtitle text-muted-foreground mb-4">{subtitle}</p>}
      {showSearch && (
        <Input
          className="pb-team__search mb-4 max-w-md"
          placeholder={portalSearchPlaceholder("team", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {showDepartments && displayDepartments.length > 0 && (
        <div className="pb-team__departments flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className={cn(
              "text-xs px-3 py-1 rounded-full border",
              !departmentId && "bg-primary text-primary-foreground border-primary",
            )}
            onClick={() => setDepartmentId(null)}
          >
            {portalAllLabel(locale)}
          </button>
          {displayDepartments.map((d) => (
            <button
              key={d.id}
              type="button"
              className={cn(
                "text-xs px-3 py-1 rounded-full border",
                departmentId === d.id && "bg-primary text-primary-foreground border-primary",
              )}
              onClick={() => setDepartmentId(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
      <ul
        className={cn(
          "pb-team__members",
          layout === "grid" && "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
          layout === "list" && "space-y-4",
        )}
      >
        {useViewModels
          ? displayViewModels.map((vm) => (
              <li key={vm.entityId}>
                <MemberCardTemplate viewModel={vm} layout={layout} />
              </li>
            ))
          : legacyMembers.map((member) => (
              <li
                key={member.id}
                className={cn(
                  "pb-team__member rounded-xl border p-4",
                  layout === "list" && "flex gap-4 items-start",
                )}
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={member.imageUrl || DEFAULT_MEDIA_PLACEHOLDER}
                    alt={pickLocale(member, "name", locale)}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="mt-3 lg:mt-0">
                  <h3 className="font-medium">{pickLocale(member, "name", locale)}</h3>
                  <p className="text-sm text-primary">{pickLocale(member, "role", locale)}</p>
                  {pickLocale(member, "bio", locale) && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {pickLocale(member, "bio", locale)}
                    </p>
                  )}
                  {member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.map((skill) => (
                        <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
      </ul>
      {searchLoading && useSearchApi && (
        <p className="text-sm text-muted-foreground py-4 text-center">Searching…</p>
      )}
      {!searchLoading && memberCount === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No team members found.</p>
      )}
    </div>
  );
}
