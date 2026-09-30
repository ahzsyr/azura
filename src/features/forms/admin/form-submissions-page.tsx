"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  bulkUpdateSubmissionsAction,
  updateSubmissionStatusAction,
} from "@/features/forms/actions";
import { ForwardModal } from "@/features/forms/admin/forward-modal";
import { SubmissionStatusBadge } from "@/features/forms/admin/submission-status-badge";
import {
  extractSubmissionContact,
  formatSubmissionReference,
} from "@/features/forms/lib/submission-contact";
import { submissionsToCsv } from "@/features/forms/submission-csv";
import { cn } from "@/lib/utils";
import {
  Archive,
  ExternalLink,
  Forward,
  Inbox,
  Loader2,
  Mail,
  MailCheck,
  MailOpen,
  Reply,
} from "lucide-react";

type SubmissionRow = {
  id: string;
  templateId: string | null;
  score: number;
  status: string;
  blockType: string | null;
  locale: string;
  createdAt: Date | string;
  assigneeId?: string | null;
  tags?: unknown;
  template: { name: string; slug: string; category?: string } | null;
  payload: unknown;
};

type FormBox = {
  key: string;
  templateId: string | null;
  name: string;
  total: number;
  unread: number;
};

type ForwardTarget = {
  id: string;
  subject: string;
  body: string;
};

function formatWhen(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildForwardDefaults(s: SubmissionRow): { subject: string; body: string } {
  const contact = extractSubmissionContact(s.payload);
  const formName = s.template?.name ?? "Form submission";
  const subject = `Fwd: ${formName}${contact.name ? ` — ${contact.name}` : ""}`;
  const body = [
    "Please see the forwarded form submission below.",
    "",
    contact.name ? `From: ${contact.name}` : null,
    contact.email ? `Email: ${contact.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, body };
}

export function FormSubmissionsPage({ submissions }: { submissions: SubmissionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("all");
  const [boxKey, setBoxKey] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [forwardTarget, setForwardTarget] = useState<ForwardTarget | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  const rows = useMemo(
    () =>
      submissions.map((s) => ({
        ...s,
        status: overrides[s.id] ?? s.status,
      })),
    [submissions, overrides],
  );

  const boxes = useMemo((): FormBox[] => {
    const map = new Map<string, FormBox>();
    for (const s of rows) {
      const key = s.templateId || s.template?.slug || "unknown";
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (s.status === "NEW") existing.unread += 1;
      } else {
        map.set(key, {
          key,
          templateId: s.templateId || null,
          name: s.template?.name ?? "Unknown form",
          total: 1,
          unread: s.status === "NEW" ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const unreadAll = useMemo(() => rows.filter((s) => s.status === "NEW").length, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (boxKey !== "all") {
        const key = s.templateId || s.template?.slug || "unknown";
        if (key !== boxKey) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const contact = extractSubmissionContact(s.payload);
        const hay = [
          JSON.stringify(s.payload),
          s.template?.name ?? "",
          contact.email ?? "",
          contact.name ?? "",
          contact.phone ?? "",
          contact.company ?? "",
          contact.preview,
          formatSubmissionReference(s.id),
          s.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search, boxKey]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const someFilteredSelected = filtered.some((s) => selected.has(s.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLiveMessage(`${next.size} selected`);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const s of filtered) next.delete(s.id);
        setLiveMessage(`${next.size} selected`);
        return next;
      }
      const next = new Set(prev);
      for (const s of filtered) next.add(s.id);
      setLiveMessage(`${next.size} selected`);
      return next;
    });
  };

  const exportCsv = () => {
    const csv = submissionsToCsv(
      filtered.map((s) => ({
        id: s.id,
        templateName: s.template?.name ?? "",
        status: s.status,
        score: s.score,
        assigneeId: s.assigneeId,
        tags: s.tags,
        locale: s.locale,
        createdAt: typeof s.createdAt === "string" ? new Date(s.createdAt) : s.createdAt,
        payload: s.payload,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyOverride = (ids: string[], status: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = status;
      return next;
    });
  };

  const clearOverrides = (ids: string[]) => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  };

  const setStatus = (id: string, status: "NEW" | "REVIEWED" | "ARCHIVED") => {
    const previous = overrides[id] ?? submissions.find((s) => s.id === id)?.status;
    applyOverride([id], status);
    startTransition(async () => {
      const res = await updateSubmissionStatusAction(id, status);
      if (!res.success) {
        if (previous) applyOverride([id], previous);
        else clearOverrides([id]);
        setLiveMessage(res.error || "Failed to update status");
        return;
      }
      clearOverrides([id]);
      setLiveMessage(
        status === "ARCHIVED"
          ? "Archived"
          : status === "NEW"
            ? "Marked as unread"
            : "Marked as read",
      );
      router.refresh();
    });
  };

  const runBulkStatus = (status: "NEW" | "REVIEWED" | "ARCHIVED") => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const previousMap = Object.fromEntries(
      ids.map((id) => [id, overrides[id] ?? submissions.find((s) => s.id === id)?.status ?? "NEW"]),
    );
    applyOverride(ids, status);
    startTransition(async () => {
      const res = await bulkUpdateSubmissionsAction(ids, { status });
      if (!res.success) {
        setOverrides((prev) => ({ ...prev, ...previousMap }));
        setLiveMessage(res.error || "Bulk update failed");
        return;
      }
      clearOverrides(ids);
      if (status === "ARCHIVED") {
        setSelected(new Set());
        setLiveMessage(`Archived ${ids.length} submission${ids.length === 1 ? "" : "s"}`);
      } else {
        setLiveMessage(
          status === "NEW"
            ? `Marked ${ids.length} as unread`
            : `Marked ${ids.length} as read`,
        );
      }
      router.refresh();
    });
  };

  const openForward = (s: SubmissionRow) => {
    const defaults = buildForwardDefaults(s);
    setForwardTarget({ id: s.id, ...defaults });
  };

  return (
    <>
      <AdminPageHeader
        title="Form Submissions"
        description="Inbox for lead, contact, and multi-step form messages."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border bg-card p-2 h-fit">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mailboxes
          </p>
          <button
            type="button"
            onClick={() => setBoxKey("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm",
              boxKey === "all" ? "bg-muted font-medium" : "hover:bg-muted/60",
            )}
          >
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              All forms
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {unreadAll > 0 && (
                <Badge className="h-5 min-w-5 justify-center px-1.5">{unreadAll}</Badge>
              )}
              {rows.length}
            </span>
          </button>
          <div className="mt-1 space-y-0.5">
            {boxes.map((box) => (
              <button
                key={box.key}
                type="button"
                onClick={() => setBoxKey(box.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm",
                  boxKey === box.key ? "bg-muted font-medium" : "hover:bg-muted/60",
                  box.unread > 0 && boxKey !== box.key && "font-semibold",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{box.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {box.unread > 0 && (
                    <Badge className="h-5 min-w-5 justify-center px-1.5">{box.unread}</Badge>
                  )}
                  {box.total}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search sender, email, phone, company, or message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <select
              className="flex h-10 rounded-lg border px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="NEW">Unread (New)</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {selected.size > 0 && (
            <Card
              role="toolbar"
              aria-label="Submission bulk actions"
              className="flex flex-wrap items-center gap-2 p-3"
            >
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runBulkStatus("REVIEWED")}
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Mark as Read
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runBulkStatus("NEW")}
              >
                Mark as Unread
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setSelected(new Set());
                  setLiveMessage("0 selected");
                }}
              >
                Clear
              </Button>
            </Card>
          )}

          <div className="overflow-y-auto overflow-x-hidden rounded-xl border bg-card max-h-[calc(100vh-14rem)]">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card text-left text-xs text-muted-foreground shadow-sm">
                <tr>
                  <th className="px-2 py-2 font-medium w-10 bg-card">
                    <input
                      type="checkbox"
                      aria-label="Select all submissions on this page"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={filtered.length === 0}
                    />
                  </th>
                  <th className="px-1 py-2 font-medium w-6 bg-card" aria-label="Unread" />
                  <th className="px-2 py-2 font-medium bg-card w-[22%]">From</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell bg-card w-[18%]">
                    Reference
                  </th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell bg-card w-[22%]">
                    Message
                  </th>
                  <th className="px-2 py-2 font-medium hidden lg:table-cell bg-card w-[14%]">Form</th>
                  <th className="px-2 py-2 font-medium hidden sm:table-cell bg-card w-[10%]">Status</th>
                  <th className="px-2 py-2 font-medium hidden sm:table-cell bg-card w-[12%]">
                    Received
                  </th>
                  <th className="px-2 py-2 font-medium text-right bg-card w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const unread = s.status === "NEW";
                  const archived = s.status === "ARCHIVED";
                  const contact = extractSubmissionContact(s.payload);
                  const fromLabel = contact.name || contact.email || "Unknown sender";
                  const reference = formatSubmissionReference(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        unread
                          ? "bg-primary/[0.04] font-semibold hover:bg-primary/[0.07]"
                          : "text-muted-foreground hover:bg-muted/40",
                        selected.has(s.id) && "bg-muted/50",
                      )}
                    >
                      <td className="px-2 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select submission from ${fromLabel}`}
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                        />
                      </td>
                      <td className="px-1 py-2.5 align-middle">
                        {unread ? (
                          <span
                            className="inline-block h-2 w-2 rounded-full bg-primary"
                            title="Unread"
                          />
                        ) : (
                          <span className="inline-block h-2 w-2" />
                        )}
                      </td>
                      <td className="px-2 py-2.5 align-middle min-w-0">
                        <Link
                          href={`/admin/form-submissions/${s.id}`}
                          className="block min-w-0 hover:underline"
                        >
                          <span className={cn("block truncate", unread && "text-foreground")}>
                            {fromLabel}
                          </span>
                          {contact.email && contact.name && (
                            <span className="block truncate text-xs font-normal text-muted-foreground">
                              {contact.email}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 align-middle hidden md:table-cell min-w-0">
                        <Link
                          href={`/admin/form-submissions/${s.id}`}
                          className="font-mono text-xs text-foreground hover:underline"
                          title={s.id}
                        >
                          {reference}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 align-middle hidden md:table-cell min-w-0">
                        <Link
                          href={`/admin/form-submissions/${s.id}`}
                          className="block truncate font-normal text-muted-foreground hover:underline"
                          title={contact.preview}
                        >
                          <span className={cn(unread && "text-foreground/90")}>{contact.preview}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 align-middle hidden lg:table-cell min-w-0">
                        <Badge
                          variant="outline"
                          className="max-w-full truncate font-normal"
                          title={s.template?.name ?? undefined}
                        >
                          {s.template?.name ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 align-middle hidden sm:table-cell">
                        <SubmissionStatusBadge status={s.status} />
                      </td>
                      <td
                        className="px-2 py-2.5 align-middle hidden sm:table-cell whitespace-nowrap font-normal text-muted-foreground text-xs"
                        title={
                          typeof s.createdAt === "string"
                            ? new Date(s.createdAt).toLocaleString()
                            : s.createdAt.toLocaleString()
                        }
                      >
                        {formatWhen(s.createdAt)}
                      </td>
                      <td className="px-2 py-2.5 align-middle">
                        <div className="flex flex-nowrap justify-end gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <Link href={`/admin/form-submissions/${s.id}`} aria-label="Open">
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <Link
                                  href={`/admin/form-submissions/${s.id}#reply`}
                                  aria-label="Reply"
                                >
                                  <Reply className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reply</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Forward"
                                disabled={pending}
                                onClick={() => openForward(s)}
                              >
                                <Forward className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Forward</TooltipContent>
                          </Tooltip>
                          {!archived && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={pending}
                                  aria-label="Archive"
                                  onClick={() => setStatus(s.id, "ARCHIVED")}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archive</TooltipContent>
                            </Tooltip>
                          )}
                          {unread ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={pending}
                                  aria-label="Mark as Read"
                                  onClick={() => setStatus(s.id, "REVIEWED")}
                                >
                                  <MailCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Read</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={pending}
                                  aria-label="Mark as Unread"
                                  onClick={() => setStatus(s.id, "NEW")}
                                >
                                  <MailOpen className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Unread</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-10 text-center">No submissions found.</p>
            )}
          </div>
        </div>
      </div>

      <ForwardModal
        open={Boolean(forwardTarget)}
        onOpenChange={(open) => {
          if (!open) setForwardTarget(null);
        }}
        submissionId={forwardTarget?.id ?? ""}
        defaultSubject={forwardTarget?.subject ?? ""}
        defaultBody={forwardTarget?.body ?? ""}
      />

      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive selected?</DialogTitle>
            <DialogDescription>
              Archive {selected.size} submission{selected.size === 1 ? "" : "s"}? You can still find
              them under the Archived status filter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setArchiveConfirmOpen(false);
                runBulkStatus("ARCHIVED");
              }}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
