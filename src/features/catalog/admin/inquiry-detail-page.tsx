"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContentItem, Inquiry } from "@prisma/client";
import { EntityAdminShell } from "./entity-admin-shell";
import { deleteInquiry, updateInquiryNotes, updateInquiryStatus } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "actions", label: "Actions" },
  { id: "settings", label: "Settings" },
];

type Props = {
  inquiry: Inquiry & {
    contentItem: Pick<ContentItem, "id" | "titleEn" | "slug" | "contentTypeId"> | null;
  };
};

export function InquiryDetailPage({ inquiry }: Props) {
  const router = useRouter();
  const notesFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pending, startTransition] = useTransition();

  const handleSave = useCallback(() => {
    notesFormRef.current?.requestSubmit();
  }, []);

  const onSave = useMemo(() => handleSave, [handleSave]);

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

  return (
    <EntityAdminShell
      title={inquiry.name}
      description={`${inquiry.type} · ${inquiry.email}`}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={activeTab === "actions" ? onSave : undefined}
      headerActions={
        <Badge variant={inquiry.status === "NEW" ? "default" : "secondary"}>{inquiry.status}</Badge>
      }
    >
      {(tab) => {
        if (tab === "overview") {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Contact & message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">{inquiry.name}</p>
                  <p className="text-muted-foreground">{inquiry.email}</p>
                  {inquiry.phone && <p className="text-muted-foreground">{inquiry.phone}</p>}
                </div>
                <div>
                  <p className="font-medium">Message</p>
                  <p className="whitespace-pre-wrap">{inquiry.message}</p>
                </div>
                {inquiry.contentItem && (
                  <div>
                    <p className="font-medium">Linked content item</p>
                    <Link
                      href={`/admin/content/catalog-items/${inquiry.contentItem.id}`}
                      className="text-primary"
                    >
                      {inquiry.contentItem.titleEn}
                      {inquiry.contentItem.slug ? ` (/${inquiry.contentItem.slug})` : ""}
                    </Link>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Received {new Date(inquiry.createdAt).toLocaleString()} · Locale: {inquiry.locale}
                </p>
              </CardContent>
            </Card>
          );
        }

        if (tab === "actions") {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Status & notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("CONTACTED")}>
                    Mark Contacted
                  </Button>
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => setStatus("CLOSED")}>
                    Close
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("NEW")}>
                    Reopen
                  </Button>
                </div>

                <form
                  ref={notesFormRef}
                  action={async (formData) => {
                    await updateInquiryNotes(inquiry.id, (formData.get("notes") as string) ?? "");
                    router.refresh();
                  }}
                  className="space-y-2"
                >
                  <Label htmlFor="notes">Internal notes</Label>
                  <Textarea id="notes" name="notes" rows={5} defaultValue={inquiry.notes ?? ""} />
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
