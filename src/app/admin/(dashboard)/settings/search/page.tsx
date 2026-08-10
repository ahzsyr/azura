import { Suspense } from "react";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadSearchSettingsPageData } from "@/capabilities/search/actions/search-settings.actions";
import { SearchSettingsAdminClient } from "@/capabilities/search/admin/search-settings-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Prisma } from "@prisma/client";

export const metadata = {
  title: "Search Settings",
};

function searchSettingsErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return "Search settings in site.json are invalid. Reset or fix the search block in Admin → Settings, or redeploy with the latest defaults.";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Could not connect to the database. Check DATABASE_URL in your Vercel project settings, confirm Supabase is active, then redeploy.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "A database query failed while loading search settings. Verify Supabase migrations are applied and DATABASE_URL uses the transaction pooler (port 6543).";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/connect|ECONNREFUSED|timeout|pool/i.test(message)) {
    return "Could not reach the database. Check DATABASE_URL in Vercel, confirm Supabase is active, then redeploy.";
  }
  return "Could not load search settings. Check Vercel environment variables and Supabase status, then try again.";
}

export default async function AdminSearchSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login?callbackUrl=/admin/settings/search");
  }

  try {
    const data = await loadSearchSettingsPageData();
    return (
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading search settings…</div>}>
        <SearchSettingsAdminClient {...data} />
      </Suspense>
    );
  } catch (error) {
    console.error("[admin/settings/search] load failed:", error);
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Search settings unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {searchSettingsErrorMessage(error)}
        </CardContent>
      </Card>
    );
  }
}
