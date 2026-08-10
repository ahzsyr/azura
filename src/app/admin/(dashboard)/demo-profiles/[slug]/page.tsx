import { notFound } from "next/navigation";
import { getDemoProfileJsonAction } from "@/features/setup/demo-import/actions";
import { listAllDemoProfiles } from "@/features/setup/demo-import/demo-profile-registry.service";
import { customProfileId, type ProfileId } from "@/features/setup/demo-import/profile-id";
import { DemoProfileEditor } from "@/features/setup/demo-import/admin/demo-profile-editor";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AdminDemoProfileEditorPage({ params }: Props) {
  const { slug } = await params;
  const profiles = await listAllDemoProfiles();
  const item = profiles.find((p) => p.slug === slug);
  if (!item) notFound();

  const profileId = (item.source === "custom" ? customProfileId(slug) : item.id) as ProfileId;
  const result = await getDemoProfileJsonAction(profileId);
  if (!result.success || !result.data) notFound();

  return (
    <DemoProfileEditor
      profileId={profileId}
      slug={slug}
      displayName={item.displayName}
      initialJson={result.data.json}
      readOnly={result.data.readOnly}
    />
  );
}
