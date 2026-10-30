import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { listModulesForAdmin } from "@/modules/module-screen";
import { modulesPageDescription } from "@/platform/packages/package-ui-copy";
import { ModuleScreen } from "./module-screen";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const model = await listModulesForAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Modules"
        description={modulesPageDescription()}
      />
      <ModuleScreen model={model} />
    </div>
  );
}
