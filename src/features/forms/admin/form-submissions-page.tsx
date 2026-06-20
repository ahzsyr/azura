"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateSubmissionStatusAction } from "@/features/forms/actions";

type SubmissionRow = {
  id: string;
  score: number;
  status: string;
  blockType: string | null;
  locale: string;
  createdAt: Date;
  template: { name: string; slug: string } | null;
  payload: unknown;
};

export function FormSubmissionsPage({ submissions }: { submissions: SubmissionRow[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const payloadStr = JSON.stringify(s.payload).toLowerCase();
        if (!payloadStr.includes(q) && !(s.template?.name.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, search]);

  return (
    <>
      <AdminPageHeader
        title="Form Submissions"
        description="Unified inbox for lead forms, contact forms, and multi-step submissions."
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search payload or template…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="flex h-10 rounded-lg border px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{s.template?.name ?? "Unknown template"}</span>
                  <Badge variant="outline">{s.status}</Badge>
                  {s.blockType && <Badge variant="secondary">{s.blockType}</Badge>}
                  <Badge>Score: {s.score}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {s.createdAt.toLocaleString()} · {s.locale}
                </p>
                <pre className="text-xs mt-2 max-h-24 overflow-auto bg-muted p-2 rounded">
                  {JSON.stringify(s.payload, null, 2)}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/form-submissions/${s.id}`}>Details</Link>
                </Button>
                {s.status === "NEW" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSubmissionStatusAction(s.id, "REVIEWED").then(() => location.reload())}
                  >
                    Mark reviewed
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No submissions yet.</Card>
        )}
      </div>
    </>
  );
}
