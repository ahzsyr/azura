"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  bulkUpdateSubmissionsAction,
  updateSubmissionWorkflowAction,
} from "@/features/forms/actions";

type Assignee = { id: string; name: string; email: string };

type SubmissionRow = {
  id: string;
  score: number;
  status: string;
  blockType: string | null;
  pageSlug: string | null;
  locale: string;
  pipelineType: string | null;
  assigneeId: string | null;
  tags: string[];
  eventCount: number;
  createdAt: Date;
  template: { name: string; slug: string; category: string } | null;
  payload: unknown;
  utm: unknown;
};

export function CommunicationsInboxPage({
  submissions,
  assignees,
}: {
  submissions: SubmissionRow[];
  assignees: Assignee[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [scoreMin, setScoreMin] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkPipeline, setBulkPipeline] = useState("");
  const [bulkTags, setBulkTags] = useState("");

  const assigneeMap = useMemo(
    () => new Map(assignees.map((a) => [a.id, a])),
    [assignees],
  );

  const templates = useMemo(() => {
    const names = new Map<string, string>();
    for (const s of submissions) {
      if (s.template) names.set(s.template.slug, s.template.name);
    }
    return [...names.entries()];
  }, [submissions]);

  const sources = useMemo(() => {
    return [...new Set(submissions.map((s) => s.blockType).filter(Boolean))] as string[];
  }, [submissions]);

  const pipelines = useMemo(() => {
    return [...new Set(submissions.map((s) => s.pipelineType).filter(Boolean))] as string[];
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (templateFilter !== "all" && s.template?.slug !== templateFilter) return false;
      if (sourceFilter !== "all" && s.blockType !== sourceFilter) return false;
      if (pipelineFilter !== "all" && s.pipelineType !== pipelineFilter) return false;
      if (scoreMin && s.score < Number(scoreMin)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const payloadStr = JSON.stringify(s.payload).toLowerCase();
        if (!payloadStr.includes(q) && !(s.template?.name.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, templateFilter, sourceFilter, pipelineFilter, scoreMin, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (input: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: string[];
  }) => {
    await bulkUpdateSubmissionsAction([...selected], input);
    setSelected(new Set());
    window.location.reload();
  };

  const bulkArchive = () => runBulk({ status: "ARCHIVED" });
  const bulkReview = () => runBulk({ status: "REVIEWED" });
  const bulkAssign = () => {
    if (!bulkAssignee) return;
    void runBulk({ assigneeId: bulkAssignee });
  };
  const bulkSetPipeline = () => {
    if (!bulkPipeline.trim()) return;
    void runBulk({ pipelineType: bulkPipeline.trim() });
  };
  const bulkAddTags = () => {
    const tags = bulkTags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tags.length) return;
    void runBulk({ tags });
  };

  const updateRow = async (
    id: string,
    input: {
      status?: "NEW" | "REVIEWED" | "ARCHIVED";
      assigneeId?: string | null;
      pipelineType?: string | null;
      tags?: string[];
    },
  ) => {
    await updateSubmissionWorkflowAction(id, input);
    window.location.reload();
  };

  return (
    <>
      <AdminPageHeader
        title="Communications Inbox"
        description="Unified inbox for form submissions and customer interactions."
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search payload or template…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select className="flex h-10 rounded-lg border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select className="flex h-10 rounded-lg border px-3 text-sm" value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}>
          <option value="all">All forms</option>
          {templates.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
        <select className="flex h-10 rounded-lg border px-3 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All sources</option>
          {sources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        <select className="flex h-10 rounded-lg border px-3 text-sm" value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)}>
          <option value="all">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Input
          type="number"
          placeholder="Min score"
          value={scoreMin}
          onChange={(e) => setScoreMin(e.target.value)}
          className="max-w-[120px]"
        />
      </div>

      {selected.size > 0 && (
        <Card className="p-3 mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button type="button" variant="outline" size="sm" onClick={bulkReview}>Mark reviewed</Button>
          <Button type="button" variant="outline" size="sm" onClick={bulkArchive}>Archive</Button>
          <select className="h-9 rounded border px-2 text-sm" value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)}>
            <option value="">Assign to…</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={bulkAssign}>Assign</Button>
          <Input
            placeholder="Pipeline type"
            value={bulkPipeline}
            onChange={(e) => setBulkPipeline(e.target.value)}
            className="max-w-[140px] h-9"
          />
          <Button type="button" variant="outline" size="sm" onClick={bulkSetPipeline}>Set pipeline</Button>
          <Input
            placeholder="Tags (comma-separated)"
            value={bulkTags}
            onChange={(e) => setBulkTags(e.target.value)}
            className="max-w-[180px] h-9"
          />
          <Button type="button" variant="outline" size="sm" onClick={bulkAddTags}>Add tags</Button>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{s.template?.name ?? "Unknown template"}</span>
                    <Badge variant="outline">{s.status}</Badge>
                    {s.blockType && <Badge variant="secondary">{s.blockType}</Badge>}
                    {s.pipelineType && <Badge variant="secondary">{s.pipelineType}</Badge>}
                    <Badge>Score: {s.score}</Badge>
                    {s.eventCount > 0 && <Badge variant="outline">{s.eventCount} events</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.createdAt.toLocaleString()} · {s.locale}
                    {s.pageSlug ? ` · ${s.pageSlug}` : ""}
                    {s.assigneeId ? ` · ${assigneeMap.get(s.assigneeId)?.name ?? s.assigneeId}` : ""}
                  </p>
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  <pre className="text-xs mt-2 max-h-24 overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(s.payload, null, 2)}
                  </pre>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <select
                      className="h-8 rounded border px-2 text-xs"
                      value={s.assigneeId ?? ""}
                      onChange={(e) => updateRow(s.id, { assigneeId: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded border px-2 text-xs"
                      value={s.status}
                      onChange={(e) => updateRow(s.id, { status: e.target.value as "NEW" | "REVIEWED" | "ARCHIVED" })}
                    >
                      <option value="NEW">New</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/form-submissions/${s.id}`}>View</Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No submissions match your filters.</p>
        )}
      </div>
    </>
  );
}
