"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Forward,
  Loader2,
  MailOpen,
  MoreHorizontal,
  Reply,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSubmissionStatusAction } from "@/features/forms/actions";
import { ForwardModal } from "@/features/forms/admin/forward-modal";
import {
  SubmissionReplyPanel,
  type SubmissionReplyPanelHandle,
} from "@/features/forms/admin/submission-reply-panel";

export function SubmissionDetailClient({
  title,
  description,
  submissionId,
  visitorEmail,
  visitorName,
  templateName,
  isArchived,
  defaultForwardSubject,
  defaultForwardBody,
  pastReplies = [],
  mainColumn,
  sidebar,
}: {
  title: string;
  description: string;
  submissionId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  templateName: string;
  isArchived: boolean;
  defaultForwardSubject: string;
  defaultForwardBody: string;
  pastReplies?: Array<{ to?: string; subject?: string; body?: string; sentAt?: string }>;
  mainColumn: ReactNode;
  sidebar: ReactNode;
}) {
  const router = useRouter();
  const replyRef = useRef<SubmissionReplyPanelHandle>(null);
  const [pending, startTransition] = useTransition();
  const [forwardOpen, setForwardOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const archive = () => {
    startTransition(async () => {
      const res = await updateSubmissionStatusAction(submissionId, "ARCHIVED");
      setArchiveOpen(false);
      if (res.success) router.refresh();
    });
  };

  const markUnread = () => {
    setMoreOpen(false);
    startTransition(async () => {
      await updateSubmissionStatusAction(submissionId, "NEW");
      router.refresh();
    });
  };

  return (
    <>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/form-submissions" aria-label="Back to inbox">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!visitorEmail || pending}
              onClick={() => replyRef.current?.open()}
              aria-label="Reply"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setForwardOpen(true)}
              aria-label="Forward"
            >
              <Forward className="h-4 w-4" />
              Forward
            </Button>
            {!isArchived && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setArchiveOpen(true)}
                aria-label="Archive"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive
              </Button>
            )}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <MoreHorizontal className="h-4 w-4" />
                More
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {moreOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close more menu"
                    onClick={() => setMoreOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute end-0 top-full z-50 mt-1 min-w-44 rounded-lg border bg-background p-1 shadow-md"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      disabled={pending}
                      onClick={markUnread}
                    >
                      <MailOpen className="h-4 w-4" />
                      Mark as Unread
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 min-w-0">
          {mainColumn}
          <SubmissionReplyPanel
            ref={replyRef}
            submissionId={submissionId}
            visitorEmail={visitorEmail}
            visitorName={visitorName}
            templateName={templateName}
            pastReplies={pastReplies}
          />
        </div>
        <div className="space-y-4 h-fit lg:sticky lg:top-4 overflow-y-auto max-h-[calc(100vh-6rem)]">
          {sidebar}
        </div>
      </div>

      <ForwardModal
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        submissionId={submissionId}
        defaultSubject={defaultForwardSubject}
        defaultBody={defaultForwardBody}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive submission?</DialogTitle>
            <DialogDescription>
              This submission will be moved to Archived. You can find it later with the Archived
              filter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={archive}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
