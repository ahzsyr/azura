import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import { SearchOpsSubnav } from "@/features/search-intelligence/workspaces/ui";
import { OperationResultView } from "@/features/search-intelligence/workspaces/operation-result-view";

export const dynamic = "force-dynamic";

export default async function SearchOpsOperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const platform = await getSearchOperationsPlatform();
  const record = platform.operations.get(id);
  if (!record) notFound();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title={record.label}
        description={`Operation ${record.id} · ${record.definitionId}`}
      />
      <SearchOpsSubnav active="Queue" />

      <div className="text-sm">
        <Link
          href="/admin/seo/search-operations/operations"
          className="text-primary hover:underline"
        >
          ← Back to operations queue
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Result</CardTitle>
          <CardDescription>
            {record.targetLabel || record.targetId || "No target"} ·{" "}
            {record.completedAt
              ? `Completed ${new Date(record.completedAt).toLocaleString()}`
              : `Updated ${new Date(record.updatedAt).toLocaleString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationResultView record={record} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
              {JSON.stringify(record.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {record.history.map((entry, idx) => (
              <div key={`${entry.at}-${idx}`} className="rounded-md border px-3 py-2">
                <div className="font-medium">{entry.status}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(entry.at).toLocaleString()}
                  {entry.note ? ` · ${entry.note}` : ""}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
