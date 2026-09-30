"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, UserCheck, UserX } from "lucide-react";
import type { InquiryType } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAdminDate } from "@/lib/admin-date-format";
import { cn } from "@/lib/utils";
import {
  INQUIRY_STATUS_TABS,
  INQUIRY_TYPES,
  statusBadgeVariant,
  type AccountFilter,
  type InquiryListRow,
} from "@/features/catalog/admin/inquiry-types";

type Props = {
  inquiries: InquiryListRow[];
};

const ACCOUNT_FILTERS: { id: AccountFilter; label: string }[] = [
  { id: "all", label: "All contacts" },
  { id: "registered", label: "Registered customers" },
  { id: "guest", label: "Guests only" },
];

function isStatusTab(id: string | null): id is (typeof INQUIRY_STATUS_TABS)[number]["id"] {
  return INQUIRY_STATUS_TABS.some((t) => t.id === id);
}

export function InquiriesListPage({ inquiries }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const accountParam = searchParams.get("account") as AccountFilter | null;

  const statusFilter = isStatusTab(statusParam) ? statusParam : "all";
  const accountFilter: AccountFilter =
    accountParam === "registered" || accountParam === "guest" ? accountParam : "all";

  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const registered = inquiries.filter((i) => i.userId).length;
    return {
      total: inquiries.length,
      new: inquiries.filter((i) => i.status === "NEW").length,
      contacted: inquiries.filter((i) => i.status === "CONTACTED").length,
      closed: inquiries.filter((i) => i.status === "CLOSED").length,
      registered,
      guest: inquiries.length - registered,
    };
  }, [inquiries]);

  const filtered = useMemo(() => {
    return inquiries.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (accountFilter === "registered" && !i.userId) return false;
      if (accountFilter === "guest" && i.userId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !i.name.toLowerCase().includes(q) &&
          !i.email.toLowerCase().includes(q) &&
          !(i.phone ?? "").toLowerCase().includes(q) &&
          !(i.user?.name ?? "").toLowerCase().includes(q) &&
          !(i.user?.email ?? "").toLowerCase().includes(q) &&
          !i.message.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [inquiries, statusFilter, typeFilter, accountFilter, search]);

  const setQuery = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.replace(`/admin/inquiries?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inquiries"
        description="Manage leads and contact requests. Inquiries from signed-in customers are linked automatically."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Customer accounts</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-scroll-reveal>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-primary">{stats.new}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered</CardTitle>
            <UserCheck className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{stats.registered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guests</CardTitle>
            <UserX className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{stats.guest}</p>
          </CardContent>
        </Card>
      </div>

      <AdminSettingsLayout
        tabs={[...INQUIRY_STATUS_TABS]}
        activeTab={statusFilter}
        onTabChange={(tabId) => setQuery({ status: tabId })}
      >
        {() => (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search name, email, message, account…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <select
                className="flex h-10 rounded-lg border bg-background px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by inquiry type"
              >
                <option value="all">All types</option>
                {INQUIRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 rounded-lg border bg-background px-3 text-sm"
                value={accountFilter}
                onChange={(e) => setQuery({ account: e.target.value })}
                aria-label="Filter by account"
              >
                {ACCOUNT_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border az-scroll az-scroll-region" data-scroll-reveal>
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Related</th>
                    <th className="px-4 py-3 font-medium">Received</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                        No inquiries match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inquiry) => (
                      <tr key={inquiry.id} className="border-t align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium">{inquiry.name}</p>
                          <a
                            href={`mailto:${inquiry.email}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            {inquiry.email}
                          </a>
                          {inquiry.phone ? (
                            <p className="text-xs text-muted-foreground">{inquiry.phone}</p>
                          ) : null}
                          <p className={cn("mt-1 line-clamp-2 text-xs text-muted-foreground")}>
                            {inquiry.message}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {inquiry.user ? (
                            <div className="space-y-1">
                              <Badge variant="default" className="text-[10px]">
                                Registered
                              </Badge>
                              <p>
                                <Link
                                  href={`/admin/users/${inquiry.user.id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {inquiry.user.name}
                                </Link>
                              </p>
                              <p className="text-xs text-muted-foreground">{inquiry.user.email}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Guest
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {inquiry.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant(inquiry.status)} className="text-[10px]">
                            {inquiry.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inquiry.contentItem ? (
                            <Link
                              href={`/admin/content/catalog-items/${inquiry.contentItem.id}`}
                              className="hover:text-primary"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Package className="size-3.5 shrink-0" aria-hidden />
                                {inquiry.contentItem.slug ?? "Untitled content"}
                              </span>
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                          {formatAdminDate(inquiry.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/inquiries/${inquiry.id}`}>Manage</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {inquiries.length} inquiries
              {stats.contacted > 0 || stats.closed > 0
                ? ` · ${stats.contacted} contacted · ${stats.closed} closed`
                : ""}
            </p>
          </div>
        )}
      </AdminSettingsLayout>
    </div>
  );
}
