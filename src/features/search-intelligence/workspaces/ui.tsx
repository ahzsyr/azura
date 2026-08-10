import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export { ActionButton } from "./action-button";

export const SEARCH_OPS_NAV = [
  { href: "/admin/seo/search-operations/overview", label: "Overview" },
  { href: "/admin/seo/search-operations/operations", label: "Operations" },
  { href: "/admin/seo/search-operations/pages", label: "Pages" },
  { href: "/admin/seo/search-operations/entities", label: "Entities" },
  { href: "/admin/seo/search-operations/content", label: "Content" },
  { href: "/admin/seo/search-operations/google", label: "Google" },
  { href: "/admin/seo/search-operations/monitoring", label: "Monitoring" },
  { href: "/admin/seo/search-operations/automation", label: "Automation" },
  { href: "/admin/seo/search-operations/settings", label: "Settings" },
] as const;

export function SearchOpsSubnav({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEARCH_OPS_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
            active === item.label
              ? "border-primary bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ActionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">{children}</CardContent>
    </Card>
  );
}
