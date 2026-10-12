import Link from "next/link";
import { listActivePackageSections } from "@/platform/packages/contributions";

/** Dashboard links for active apps. Inactive packages are omitted so the links cannot 404. */
export async function ActivePackageSections() {
  let sections: { id: string; label: string; href: string }[] = [];
  try {
    sections = await listActivePackageSections();
  } catch (error) {
    console.error("[admin/dashboard] package sections skipped", error);
    return null;
  }
  if (sections.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Installed apps</h2>
      <ul className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={section.href}
              className="inline-flex rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
