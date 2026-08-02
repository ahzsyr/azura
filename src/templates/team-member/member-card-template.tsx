"use client";

import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import { MemberCardBody } from "@/templates/team-member/member-card-body";

type Props = {
  viewModel: TeamMemberCardViewModel;
  className?: string;
  layout?: "grid" | "list";
};

export function MemberCardTemplate({ viewModel, className, layout }: Props) {
  return <MemberCardBody viewModel={viewModel} className={className} layout={layout} />;
}
