"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Inquiry, InquiryType, ContentItem } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InquiryRow = Inquiry & {
  contentItem: Pick<ContentItem, "id" | "titleEn" | "slug" | "contentTypeId"> | null;
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "CLOSED", label: "Closed" },
];

type Props = {
  inquiries: InquiryRow[];
};

export function InquiriesListPage({ inquiries }: Props) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return inquiries.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !i.name.toLowerCase().includes(q) &&
          !i.email.toLowerCase().includes(q) &&
          !(i.phone ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [inquiries, statusFilter, typeFilter, search]);

  return (
    <>
      <AdminPageHeader title="Inquiries" description="Manage leads and contact requests." />

      <AdminSettingsLayout
        tabs={STATUS_TABS}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
      >
        {() => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <select
                className="flex h-10 rounded-lg border px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All types</option>
                {(["GENERAL", "PACKAGE", "CONTENT", "VISA", "CONTACT"] as InquiryType[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {filtered.map((inquiry) => (
                <div key={inquiry.id} className="rounded-xl border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{inquiry.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {inquiry.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {inquiry.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inquiry.email}
                        {inquiry.phone ? ` · ${inquiry.phone}` : ""}
                      </p>
                      <p className={cn("mt-2 line-clamp-2 text-sm")}>{inquiry.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(inquiry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/inquiries/${inquiry.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-muted-foreground">No inquiries match your filters.</p>
              )}
            </div>
          </div>
        )}
      </AdminSettingsLayout>
    </>
  );
}
