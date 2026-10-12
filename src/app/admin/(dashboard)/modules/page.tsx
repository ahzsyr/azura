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
        description="Install and activate apps that this deployment includes. Enabling an app also enables the presets it requires. Deactivating an app removes its admin links together with its routes."
      />
      <ModuleScreen model={model} />
    </div>
  );
}
