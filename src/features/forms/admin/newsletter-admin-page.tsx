"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resendNewsletterConfirmAction } from "@/features/forms/actions";
import { subscribersToCsv } from "@/features/forms/newsletter-csv";

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  segment: string;
  status: string;
  createdAt: Date;
  confirmToken: string | null;
};

export function NewsletterAdminPage({ subscribers }: { subscribers: SubscriberRow[] }) {
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (segmentFilter !== "all" && s.segment !== segmentFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [subscribers, segmentFilter, statusFilter]);

  const segments = useMemo(
    () => [...new Set(subscribers.map((s) => s.segment))],
    [subscribers],
  );

  const exportCsv = () => {
    const csv = subscribersToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AdminPageHeader
        title="Newsletter Subscribers"
        description="Manage segments, double opt-in confirmations, and exports."
        actions={
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="flex h-10 rounded-lg border px-3 text-sm"
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
        >
          <option value="all">All segments</option>
          {segments.map((seg) => (
            <option key={seg} value={seg}>
              {seg}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 rounded-lg border px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.email}</span>
                <Badge variant="outline">{s.status}</Badge>
                <Badge variant="secondary">{s.segment}</Badge>
              </div>
              {s.name && <p className="text-sm text-muted-foreground">{s.name}</p>}
              <p className="text-xs text-muted-foreground mt-1">{s.createdAt.toLocaleString()}</p>
            </div>
            {s.status === "PENDING" && (
              <div className="flex flex-col gap-1 items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resendNewsletterConfirmAction(s.id).then(() => location.reload())}
                >
                  Resend confirmation
                </Button>
                {s.confirmToken && (
                  <p className="text-[10px] text-muted-foreground max-w-xs truncate">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/api/newsletter/confirm/${s.confirmToken}`}
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No subscribers yet.</Card>
        )}
      </div>
    </>
  );
}
