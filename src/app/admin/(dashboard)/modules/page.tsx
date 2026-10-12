import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { listModulesForAdmin } from "@/modules/module-screen";
import { ModuleScreen } from "./module-screen";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const model = await listModulesForAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Modules"
        description="Turn included modules and their required presets on or off for this installation. A deployment profile that omitted a module cannot be overridden here."
      />
      <ModuleScreen model={model} />
    </div>
  );
}
