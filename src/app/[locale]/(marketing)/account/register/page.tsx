import { AccountRegisterForm } from "@/components/account/account-register-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountRegisterPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="container-premium py-12 md:py-16">
      <AccountRegisterForm locale={locale} />
    </div>
  );
}
