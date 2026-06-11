import { prisma } from "@/lib/prisma";
import { upsertCustom404Action } from "@/features/seo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function Custom404AdminPage() {
  const pages = await prisma.custom404.findMany();

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">404 Page Manager</h1>
      {(["en", "ar"] as const).map((locale) => {
        const existing = pages.find((p) => p.locale === locale);
        return (
          <form key={locale} action={upsertCustom404Action} className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold uppercase">{locale}</h2>
            <input type="hidden" name="locale" value={locale} />
            <div>
              <Label>Title EN</Label>
              <Input name="titleEn" defaultValue={existing?.titleEn ?? "Page not found"} required />
            </div>
            <div>
              <Label>Title AR</Label>
              <Input name="titleAr" defaultValue={existing?.titleAr ?? "الصفحة غير موجودة"} dir="rtl" required />
            </div>
            <div>
              <Label>Body EN</Label>
              <Textarea name="bodyEn" defaultValue={existing?.bodyEn ?? ""} rows={3} required />
            </div>
            <div>
              <Label>Body AR</Label>
              <Textarea name="bodyAr" defaultValue={existing?.bodyAr ?? ""} dir="rtl" rows={3} required />
            </div>
            <input type="hidden" name="blocks" value="[]" />
            <Button type="submit">Save {locale}</Button>
          </form>
        );
      })}
    </div>
  );
}
