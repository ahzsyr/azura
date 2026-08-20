"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { backToHelpHref } from "@/features/help/lib/help-href";

export function BackToHelpLink() {
  const searchParams = useSearchParams();
  const fromHelp = searchParams.get("from") === "help";
  if (!fromHelp) return null;

  const helpTopic = searchParams.get("helpTopic");
  const href = backToHelpHref(helpTopic);

  return (
    <Button asChild variant="ghost" size="sm" className="hidden h-8 gap-1 px-2 sm:inline-flex">
      <Link href={href}>
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Help
      </Link>
    </Button>
  );
}
