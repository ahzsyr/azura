import { listCommunicationsInbox } from "@/features/forms/communications-inbox.service";
import { listAdminAssignees } from "@/features/forms/admin-users.service";
import { CommunicationsInboxPage } from "@/features/forms/admin/communications-inbox/communications-inbox-page";

export default async function CommunicationsPage() {
  const [submissions, assignees] = await Promise.all([
    listCommunicationsInbox(),
    listAdminAssignees(),
  ]);
  return <CommunicationsInboxPage submissions={submissions} assignees={assignees} />;
}
