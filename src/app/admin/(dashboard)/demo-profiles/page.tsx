import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  loadDemoProfilesAdminData,
} from "@/features/setup/demo-import/demo-profile-registry.service";
import { DemoProfilesPage } from "@/features/setup/demo-import/admin/demo-profiles-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const maxDuration = 300;

export default async function AdminDemoProfilesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login?callbackUrl=/admin/demo-profiles");
  }


  try {
    const { profiles, lastApplied } = await loadDemoProfilesAdminData();
    return <DemoProfilesPage profiles={profiles} lastApplied={lastApplied} />;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/demo-profiles] load failed:", error);
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Demo profiles unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load demo profiles from the database. Check DATABASE_URL in your deployment
          settings, confirm Supabase is active, then redeploy and try again.
        </CardContent>
      </Card>
    );
  }
}
