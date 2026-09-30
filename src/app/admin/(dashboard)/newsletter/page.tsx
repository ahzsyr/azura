import { listNewsletterSubscribers } from "@/features/forms/newsletter.service";
import { NewsletterAdminPage } from "@/features/forms/admin/newsletter-admin-page";

export default async function AdminNewsletterPage() {
  let subscribers: Awaited<ReturnType<typeof listNewsletterSubscribers>> = [];
  try {
    subscribers = await listNewsletterSubscribers();
  } catch {
    // DB not connected
  }
  return <NewsletterAdminPage subscribers={subscribers} />;
}
