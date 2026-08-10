"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerListRow } from "@/features/account/users.service";
import { formatAdminDate } from "@/lib/admin-date-format";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  users: CustomerListRow[];
  initialSearch?: string;
};

export function UsersListPage({ users, initialSearch = "" }: Props) {
  const [search, setSearch] = useState(initialSearch);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        (u.city ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <>
      <AdminPageHeader
        title="Customer accounts"
        description="Manage registered visitors, profiles, and passwords."
      />
      <div className="mb-4 max-w-md">
        <Input
          placeholder="Search name, email, phone, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                  No customer accounts found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {formatAdminDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${u.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
