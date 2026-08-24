import Link from "next/link";
import type { SeoUnifiedScore, SeoCategoryKey } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  score: SeoUnifiedScore;
  issuesBaseHref?: string;
  snapshotId?: string;
};

const gradeStyles = {
  good: "text-emerald-700 bg-emerald-50 border-emerald-200",
  fair: "text-amber-800 bg-amber-50 border-amber-200",
  poor: "text-red-800 bg-red-50 border-red-200",
};

function categoryHref(
  key: SeoCategoryKey,
  issuesBaseHref: string,
  snapshotId?: string,
) {
  const params = new URLSearchParams();
  params.set("category", key === "schema" ? "schema" : key);
  if (snapshotId) params.set("snapshotId", snapshotId);
  return `${issuesBaseHref}?${params.toString()}`;
}

export function SeoUnifiedScorePanel({
  score,
  issuesBaseHref = "/admin/seo/issues",
  snapshotId,
}: Props) {
  const categories = Object.values(score.categories);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border px-5 py-4 flex items-end justify-between gap-4",
          gradeStyles[score.grade],
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold opacity-80">SEO Health</p>
          <p className="text-4xl font-bold tabular-nums">{score.overall}</p>
        </div>
        <p className="text-sm font-medium capitalize pb-1">{score.grade}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {categories.map((cat) => (
          <li key={cat.key}>
            <Link
              href={categoryHref(cat.key, issuesBaseHref, snapshotId)}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(cat.weight * 100)}% of overall
                </p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{cat.score}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
