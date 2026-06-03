import { useTranslations } from "next-intl";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import type { PackageCardData } from "./package-card";

type PackageWithCategory = PackageCardData;

export function PackageComparisonTable({
  packages,
  locale,
}: {
  packages: PackageWithCategory[];
  locale: string;
}) {
  const t = useTranslations("packages");
  const tCommon = useTranslations("common");
  const rows = [
    {
      key: "duration",
      label: t("duration"),
      get: (p: PackageWithCategory) => `${p.duration} ${t("days")}`,
    },
    {
      key: "price",
      label: t("price"),
      get: (p: PackageWithCategory) => formatPrice(Number(p.price), p.currency, locale),
    },
    {
      key: "category",
      label: t("category"),
      get: (p: PackageWithCategory) => getLocalizedField(p.category, "name", locale),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-4 text-start font-medium">{tCommon("feature")}</th>
            {packages.map((pkg) => (
              <th key={pkg.id} className="p-4 text-start font-medium">
                {getLocalizedField(pkg, "name", locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="p-4 font-medium">{row.label}</td>
              {packages.map((pkg) => (
                <td key={pkg.id} className="p-4 text-muted-foreground">
                  {row.get(pkg)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
