"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syncFavoritesFromServer } from "@/features/account/lib/favorites-sync";
import {
  SavedFavoritesList,
  type FavoriteListItem,
} from "@/features/account/components/saved-favorites-list";

type InquiryRow = {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
  contentItem?: { slug: string | null; titleEn: string; titleAr: string } | null;
};

type Props = {
  locale: string;
  userName: string;
  userEmail: string;
};

export function AccountDashboard({ locale, userName, userEmail }: Props) {
  const [tab, setTab] = useState<"saved" | "inquiries">("saved");
  const [favorites, setFavorites] = useState<FavoriteListItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void syncFavoritesFromServer();
    async function load() {
      setLoading(true);
      const [favRes, inqRes] = await Promise.all([
        fetch("/api/account/favorites"),
        fetch("/api/account/inquiries"),
      ]);
      if (favRes.ok) {
        const data = (await favRes.json()) as { favorites?: FavoriteListItem[] };
        setFavorites(data.favorites ?? []);
      }
      if (inqRes.ok) {
        const data = (await inqRes.json()) as { inquiries?: InquiryRow[] };
        setInquiries(data.inquiries ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">My account</h1>
          <p className="text-muted-foreground mt-1">
            {userName} · {userEmail}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: `/${locale}` })}
        >
          Sign out
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        <Button
          type="button"
          variant={tab === "saved" ? "default" : "outline"}
          onClick={() => setTab("saved")}
        >
          Saved
        </Button>
        <Button
          type="button"
          variant={tab === "inquiries" ? "default" : "outline"}
          onClick={() => setTab("inquiries")}
        >
          Inquiries
        </Button>
      </div>

      {tab === "saved" ? (
        <SavedFavoritesList locale={locale} items={favorites} loading={loading} />
      ) : loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your inquiries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inquiries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No inquiries yet.</p>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{inq.type}</span>
                    <span className="text-muted-foreground">{inq.status}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-3">{inq.message}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(inq.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
