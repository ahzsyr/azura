"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, Mail, Phone, Unlink, User } from "lucide-react";
import { EntityAdminShell } from "./entity-admin-shell";
import {
  deleteInquiry,
  linkInquiryToCustomer,
  unlinkInquiryFromCustomer,
  updateInquiryNotes,
  updateInquiryStatus,
} from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatAdminDate } from "@/lib/admin-date-format";
import { statusBadgeVariant, type InquiryCustomer, type InquiryDetail } from "@/features/catalog/admin/inquiry-types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "manage", label: "Manage" },
  { id: "settings", label: "Settings" },
] as const;

type Props = {
  inquiry: InquiryDetail;
  suggestedCustomer: InquiryCustomer | null;
};

export function InquiryDetailPage({ inquiry, suggestedCustomer }: Props) {
  const router = useRouter();
  const notesFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pending, startTransition] = useTransition();
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    notesFormRef.current?.requestSubmit();
  }, []);

  const handleCancel = useCallback(() => {
    router.refresh();
  }, [router]);

  const onSave = useMemo(() => handleSave, [handleSave]);
  const onCancel = useMemo(
    () => (activeTab === "manage" ? handleCancel : undefined),
    [activeTab, handleCancel]
  );

  const setStatus = (status: "NEW" | "CONTACTED" | "CLOSED") => {
    startTransition(async () => {
      await updateInquiryStatus(inquiry.id, status);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this inquiry permanently?")) return;
    startTransition(async () => {
      await deleteInquiry(inquiry.id);
      router.push("/admin/inquiries");
    });
  };

  const handleLinkCustomer = (userId: string) => {
    setLinkError(null);
    startTransition(async () => {
      try {
        await linkInquiryToCustomer(inquiry.id, userId);
        router.refresh();
      } catch (e) {
        setLinkError(e instanceof Error ? e.message : "Could not link account");
      }
    });
  };

  const handleUnlink = () => {
    if (!confirm("Remove the link to this customer account?")) return;
    startTransition(async () => {
      await unlinkInquiryFromCustomer(inquiry.id);
      router.refresh();
    });
  };

  return (
    <EntityAdminShell
      title={inquiry.name}
      description={`${inquiry.type} · ${inquiry.email}`}
      tabs={[...TABS]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      trackFormId={activeTab === "manage" ? "inquiry-notes-form" : undefined}
      onSave={activeTab === "manage" ? onSave : undefined}
      onCancel={onCancel}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(inquiry.status)}>{inquiry.status}</Badge>
          {inquiry.user ? (
            <Badge variant="default">Registered customer</Badge>
          ) : (
            <Badge variant="outline">Guest</Badge>
          )}
        </div>
      }
    >
      {(tab) => {
        if (tab === "overview") {
          return (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contact & message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-base">{inquiry.name}</p>
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="size-4" aria-hidden />
                      {inquiry.email}
                    </a>
                    {inquiry.phone ? (
                      <p className="inline-flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-4" aria-hidden />
                        {inquiry.phone}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Message</p>
                    <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3">
                      {inquiry.message}
                    </p>
                  </div>
                  {inquiry.contentItem ? (
                    <div>
                      <p className="mb-1 font-medium">Related content</p>
                      <Link
                        href={`/admin/content/catalog-items/${inquiry.contentItem.id}`}
                        className="text-primary hover:underline"
                      >
                        {inquiry.contentItem.slug ?? "Untitled content"}
                        {inquiry.contentItem.slug ? ` (/${inquiry.contentItem.slug})` : ""}
                      </Link>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Received {formatAdminDate(inquiry.createdAt)} · Locale {inquiry.locale}
                  </p>
                </CardContent>
              </Card>

              <CustomerAccountCard
                inquiry={inquiry}
                suggestedCustomer={suggestedCustomer}
                pending={pending}
                linkError={linkError}
                onLink={handleLinkCustomer}
                onUnlink={handleUnlink}
              />
            </div>
          );
        }

        if (tab === "manage") {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Status & notes</CardTitle>
                <CardDescription>Update pipeline stage and internal notes for your team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("CONTACTED")}>
                    Mark contacted
                  </Button>
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => setStatus("CLOSED")}>
                    Close
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("NEW")}>
                    Reopen
                  </Button>
                </div>

                <form
                  id="inquiry-notes-form"
                  ref={notesFormRef}
                  action={async (formData) => {
                    await updateInquiryNotes(inquiry.id, (formData.get("notes") as string) ?? "");
                    router.refresh();
                  }}
                  className="space-y-2"
                >
                  <Label htmlFor="notes">Internal notes</Label>
                  <Textarea id="notes" name="notes" rows={6} defaultValue={inquiry.notes ?? ""} />
                  <Button type="submit" size="sm" disabled={pending}>
                    Save notes
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>Permanently remove this inquiry record.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" disabled={pending} onClick={handleDelete}>
                Delete inquiry
              </Button>
            </CardContent>
          </Card>
        );
      }}
    </EntityAdminShell>
  );
}

function CustomerAccountCard({
  inquiry,
  suggestedCustomer,
  pending,
  linkError,
  onLink,
  onUnlink,
}: {
  inquiry: InquiryDetail;
  suggestedCustomer: InquiryCustomer | null;
  pending: boolean;
  linkError: string | null;
  onLink: (userId: string) => void;
  onUnlink: () => void;
}) {
  const user = inquiry.user;

  return (
    <Card className={user ? "border-primary/25" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-4" aria-hidden />
          Customer account
        </CardTitle>
        <CardDescription>
          {user
            ? "This inquiry is linked to a registered visitor account."
            : "Link to a customer when the same person signed up on the site."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {linkError ? <p className="text-destructive text-sm">{linkError}</p> : null}

        {user ? (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground">{user.email}</p>
              {user.phone ? <p className="text-muted-foreground">{user.phone}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/admin/users/${user.id}`}>
                  Manage customer
                  <ExternalLink className="ms-2 size-3.5" aria-hidden />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={onUnlink}
              >
                <Unlink className="me-2 size-3.5" aria-hidden />
                Unlink account
              </Button>
            </div>
          </>
        ) : suggestedCustomer ? (
          <>
            <p className="text-muted-foreground">
              A customer account matches this inquiry email. Link to attach history and profile.
            </p>
            <div className="rounded-lg border border-dashed p-3 space-y-1">
              <p className="font-medium">{suggestedCustomer.name}</p>
              <p className="text-muted-foreground">{suggestedCustomer.email}</p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => onLink(suggestedCustomer.id)}
            >
              <Link2 className="me-2 size-3.5" aria-hidden />
              Link to {suggestedCustomer.name}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">
            No linked account. If the visitor registers later with the same email, new inquiries will
            link automatically. You can also create a customer from{" "}
            <Link href="/admin/users" className="text-primary hover:underline">
              Customer accounts
            </Link>
            .
          </p>
        )}

        {inquiry.email && !user ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/users?search=${encodeURIComponent(inquiry.email)}`}
            >
              Search customers by email
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
