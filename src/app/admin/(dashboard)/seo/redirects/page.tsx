import { seoRepository } from "@/repositories/seo.repository";
import { upsertRedirectAction } from "@/features/seo/actions";
import { DeleteRedirectButton } from "./delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function RedirectsPage() {
  const redirects = await seoRepository.listRedirects(false);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Redirect Manager</h1>
      <form action={upsertRedirectAction} className="space-y-4 border rounded-lg p-4">
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
          <select name="type" className="w-full border rounded-md h-10 px-3">
            <option value="PERMANENT">301 Permanent</option>
            <option value="TEMPORARY">302 Temporary</option>
          </select>
        </div>
        <input type="hidden" name="isActive" value="true" />
        <Button type="submit">Add redirect</Button>
      </form>
      <ul className="divide-y border rounded-lg">
        {redirects.map((r) => (
          <li key={r.id} className="p-4 flex justify-between items-center">
            <span className="text-sm">
              {r.fromPath} → {r.toPath} ({r.type})
            </span>
            <DeleteRedirectButton id={r.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
