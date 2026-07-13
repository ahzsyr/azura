"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  viewModel: TeamMemberCardViewModel;
  className?: string;
  layout?: "grid" | "list";
};

export function MemberCardBody({ viewModel, className, layout = "grid" }: Props) {
  return (
    <div
      className={cn(
        "pb-team__member rounded-xl border p-4",
        layout === "list" && "flex gap-4 items-start",
        className,
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
        <Image
          src={viewModel.imageUrl || DEFAULT_MEDIA_PLACEHOLDER}
          alt={viewModel.imageAlt}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="mt-3 lg:mt-0">
        <h3 className="font-medium">{viewModel.name}</h3>
        {viewModel.role && <p className="text-sm text-primary">{viewModel.role}</p>}
        {viewModel.bio && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{viewModel.bio}</p>
        )}
        {viewModel.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {viewModel.skills.map((skill) => (
              <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
