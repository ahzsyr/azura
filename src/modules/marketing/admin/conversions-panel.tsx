"use client";

import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminServerFormTopBarActions } from "@/components/admin/layout/admin-server-form-top-bar-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertConversionDefinitionAction } from "@/modules/marketing/actions";

export function MarketingConversionsPanel({
  definitions,
  recent,
}: {
  definitions: Array<{
    id: string;
    key: string;
    name: string;
    triggerType: string;
    enabled: boolean;
  }>;
  recent: Array<{
    id: string;
    clientOccurredAt: Date;
    conversionDefinition: { name: string };
    internalCampaign: { name: string } | null;
    source: { label: string } | null;
  }>;
}) {
  return (
    <div className="space-y-6">
      <AdminServerFormTopBarActions
        formId="marketing-conversions-form"
        ownerKey="marketing-conversions"
        saveLabel="Save"
      />
      <AdminPageHeader
        title="Conversions"
        description="Configurable business conversion events. ROI/ROAS are not shown until revenue attribution exists."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / update definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="marketing-conversions-form"
            data-admin-save-form=""
            action={upsertConversionDefinitionAction}
            className="grid gap-2 md:grid-cols-4"
          >
            <Input name="key" placeholder="key (e.g. rfq)" required />
            <Input name="name" placeholder="Display name" required />
            <Input name="triggerType" placeholder="triggerType" defaultValue="form_submit" />
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {definitions.map((d) => (
              <div key={d.id} className="flex justify-between border-b py-1">
                <span>
                  {d.name} <span className="text-muted-foreground">({d.key})</span>
                </span>
                <span>{d.enabled ? "enabled" : "disabled"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent conversions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {recent.length === 0 ? (
              <p className="text-muted-foreground">None yet.</p>
            ) : (
              recent.map((c) => (
                <div key={c.id} className="flex justify-between border-b py-1">
                  <span>{c.conversionDefinition.name}</span>
                  <span className="text-muted-foreground">
                    {c.internalCampaign?.name ?? "—"} · {c.source?.label ?? "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
