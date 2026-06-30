import { SetupWizard } from "@/components/setup/setup-wizard";

import { getSetupStatus } from "@/features/setup/setup.service";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SetupPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;
  const setupStatus = await getSetupStatus();

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <SetupWizard
        setupToken={token}
        databaseReady={setupStatus.databaseReady}
        databaseError={setupStatus.databaseError}
        databaseKind={setupStatus.databaseKind}
        setupAlreadyComplete={setupStatus.setupComplete}
      />
    </div>
  );
}
