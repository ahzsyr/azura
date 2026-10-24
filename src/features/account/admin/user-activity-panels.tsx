import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAdminDate } from "@/lib/admin-date-format";
import type { UserActivity } from "@/features/account/admin/user-portal-types";

type Props = {
  userId: string;
  activity: UserActivity;
  usagePage: number;
};

export function UserActivityPanels({ userId, activity, usagePage }: Props) {
  const base = `/admin/settings/users/${userId}`;
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.funnel.map((stage, index) => (
            <div key={stage.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
              <div>
                <p className="text-sm font-medium">
                  {index + 1}. {stage.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {stage.detail || (stage.reached ? "Reached" : "Not seen yet")}
                </p>
              </div>
              <div className="text-end">
                <Badge variant={stage.reached ? "secondary" : "outline"}>
                  {stage.reached ? "Reached" : "Waiting"}
                </Badge>
                {stage.at ? (
                  <p className="text-muted-foreground mt-1 text-xs">{formatAdminDate(stage.at)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login log</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.loginLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sign-in events recorded for this account.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.loginLog.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                  <span>
                    {row.action}
                    {row.detail ? <span className="text-muted-foreground"> · {row.detail}</span> : null}
                    {row.ip ? <span className="text-muted-foreground"> · {row.ip}</span> : null}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatAdminDate(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.usage.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No storefront activity is linked to this account yet. Visits on this browser appear after the next sign-in.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.usage.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                  <span>
                    {row.name}
                    {row.path ? <span className="text-muted-foreground"> · {row.path}</span> : null}
                    {row.device ? <span className="text-muted-foreground"> · {row.device}</span> : null}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatAdminDate(row.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            {usagePage > 0 ? (
              <Button asChild size="sm" variant="outline">
                <Link href={usagePage === 1 ? base : `${base}?usagePage=${usagePage - 1}`}>Newer</Link>
              </Button>
            ) : null}
            {activity.usageHasMore ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`${base}?usagePage=${usagePage + 1}`}>Older</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
