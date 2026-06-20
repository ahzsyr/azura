"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";
import {
  portalAllLabel,
  portalSearchPlaceholder,
} from "@/features/portal-blocks/lib/portal-ui-labels";
import type { TeamDirectoryPublic } from "@/features/team/types";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  locale: Locale;
  directory: TeamDirectoryPublic;
  title?: string;
  subtitle?: string;
  layout?: "grid" | "list";
  showSearch?: boolean;
  showDepartments?: boolean;
};

export function TeamDirectoryView({
  locale,
  directory,
  title,
  subtitle,
  layout = "grid",
  showSearch = true,
  showDepartments = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.members.filter((m) => {
      if (departmentId && m.departmentId !== departmentId) return false;
      if (!q) return true;
      const name = pickLocale(m, "name", locale).toLowerCase();
      const role = pickLocale(m, "role", locale).toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [directory.members, departmentId, query, locale]);

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
      {showDepartments && directory.departments.length > 0 && (
        <div className="pb-team__departments flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className={cn(
              "text-xs px-3 py-1 rounded-full border",
              !departmentId && "bg-primary text-primary-foreground border-primary"
            )}
            onClick={() => setDepartmentId(null)}
          >
            {portalAllLabel(locale)}
          </button>
          {directory.departments.map((d) => (
            <button
              key={d.id}
              type="button"
              className={cn(
                "text-xs px-3 py-1 rounded-full border",
                departmentId === d.id && "bg-primary text-primary-foreground border-primary"
              )}
              onClick={() => setDepartmentId(d.id)}
            >
              {pickLocale(d, "name", locale)}
            </button>
          ))}
        </div>
      )}
      <ul
        className={cn(
          "pb-team__members",
          layout === "grid" && "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
          layout === "list" && "space-y-4"
        )}
      >
        {members.map((member) => (
          <li
            key={member.id}
            className={cn(
              "pb-team__member rounded-xl border p-4",
              layout === "list" && "flex gap-4 items-start"
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
    </div>
  );
}
