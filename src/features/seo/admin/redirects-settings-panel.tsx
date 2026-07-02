import { upsertRedirectAction } from "@/features/seo/actions";
import { RedirectDeleteButton } from "@/features/seo/admin/redirect-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  type: string;
};

type RedirectsSettingsPanelProps = {
  redirects: RedirectRow[];
  embedded?: boolean;
};

export function RedirectsSettingsPanel({ redirects, embedded = false }: RedirectsSettingsPanelProps) {
  return (
    <div className={embedded ? "space-y-6" : "max-w-2xl space-y-8"}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Redirect Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">301/302 URL rules for SEO and content moves.</p>
        </div>
      ) : null}

      <form action={upsertRedirectAction} className="space-y-4 rounded-lg border p-4">
        <div>
          <Label>From path</Label>
          <Input name="fromPath" placeholder="/en/old-page" required />
        </div>
        <div>
          <Label>To path</Label>
          <Input name="toPath" placeholder="/en/pages/new-page" required />
        </div>
        <div>
          <Label>Type</Label>
          <select name="type" className="h-10 w-full rounded-md border px-3">
            <option value="PERMANENT">301 Permanent</option>
            <option value="TEMPORARY">302 Temporary</option>
          </select>
        </div>
        <input type="hidden" name="isActive" value="true" />
        <Button type="submit">Add redirect</Button>
      </form>

      <ul className="divide-y rounded-lg border">
        {redirects.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-4">
            <span className="text-sm">
              {r.fromPath} → {r.toPath} ({r.type})
            </span>
            <RedirectDeleteButton id={r.id} />
          </li>
        ))}
        {redirects.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No redirects configured.</li>
        ) : null}
      </ul>
    </div>
  );
}
