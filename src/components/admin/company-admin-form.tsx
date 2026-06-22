"use client";

import { useCallback, useEffect, useRef } from "react";
import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import type { CompanyInfoView } from "@/features/translation/admin-localized-view";
import { readAdminDefaultLocaleField } from "@/features/translation/admin-localized-view";
import { updateCompanyInfo } from "@/lib/actions/admin";
import { AdminFormProvider, useAdminForm } from "@/components/admin/layout/admin-form-provider";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_BRAND_NAME } from "@/config/site";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

const TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "contact", label: "Contact" },
  { id: "localization", label: "Localization" },
] as const;

type Props = {
  company: CompanyInfoView | null;
};

function CompanyFormFields({ company, formRef }: Props & { formRef: React.RefObject<HTMLFormElement | null> }) {
  const { setDirty } = useAdminForm();
  const companyRow = (company ?? {}) as Record<string, unknown>;
  const defaultValuesEn = JSON.stringify(["Trust", "Excellence", "Devotion", "Care"]);
  const defaultValuesAr = JSON.stringify(["الثقة", "التميز", "الإخلاص", "الرعاية"]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const markDirty = () => setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [formRef, setDirty]);

  return (
    <>
      <AdminPageHeader
        title="Company Info"
        description="Manage your business profile, story, and contact details."
      />

      <AdminSettingsLayout tabs={[...TABS]} defaultTab="general">
        {(activeTab) => (
          <>
            {activeTab === "general" && (
              <Card>
                <CardHeader>
                  <CardTitle>General</CardTitle>
                  <CardDescription>Basic company identity and registration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input name="name" defaultValue={company?.name ?? DEFAULT_BRAND_NAME} required />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Registration No</Label>
                      <Input name="registrationNo" defaultValue={company?.registrationNo} />
                    </div>
                    <div className="space-y-2">
                      <Label>License Info</Label>
                      <Textarea name="licenseInfo" defaultValue={company?.licenseInfo} />
                    </div>
                  </div>
                  <input type="hidden" name="trustBadges" defaultValue={JSON.stringify(company?.trustBadges ?? ["Licensed", "Registered", "IATA Partner"])} />
                </CardContent>
              </Card>
            )}

            {activeTab === "content" && (
              <>
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>Story, mission, and vision in both languages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AdminLocalizedFormField fieldKey="tagline" label="Tagline" legacyEntity={company ?? undefined} />
                  <AdminLocalizedFormField fieldKey="story" label="Story" legacyEntity={company ?? undefined} multiline rows={4} />
                  <AdminLocalizedFormField fieldKey="mission" label="Mission" legacyEntity={company ?? undefined} multiline rows={3} />
                  <AdminLocalizedFormField fieldKey="vision" label="Vision" legacyEntity={company ?? undefined} multiline rows={3} />
                  <input
                    type="hidden"
                    name="valuesEn"
                    defaultValue={readAdminDefaultLocaleField(companyRow, "values", defaultValuesEn)}
                  />
                  <input
                    type="hidden"
                    name="valuesAr"
                    defaultValue={
                      readLegacyFieldForLocale(companyRow, "values", "ar") || defaultValuesAr
                    }
                  />
                </CardContent>
              </Card>
              <LocaleTabPanel
                entityType="CompanyInfo"
                entityId="default"
                sourceData={{
                  name: company?.name ?? "",
                  tagline: readAdminDefaultLocaleField(companyRow, "tagline", ""),
                  story: readAdminDefaultLocaleField(companyRow, "story", ""),
                  mission: readAdminDefaultLocaleField(companyRow, "mission", ""),
                  address: readAdminDefaultLocaleField(companyRow, "address", ""),
                }}
              />
              </>
            )}

            {activeTab === "contact" && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                  <CardDescription>Phone, email, and office details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input name="phone" defaultValue={company?.phone} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input name="whatsapp" defaultValue={company?.whatsapp} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input name="email" type="email" defaultValue={company?.email} />
                    </div>
                  </div>
                  <input type="hidden" name="socialLinks" defaultValue={JSON.stringify(company?.socialLinks ?? {})} />
                </CardContent>
              </Card>
            )}

            {activeTab === "localization" && (
              <Card>
                <CardHeader>
                  <CardTitle>Localization</CardTitle>
                  <CardDescription>Addresses and office hours by locale.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AdminLocalizedFormField fieldKey="address" label="Address" legacyEntity={company ?? undefined} multiline rows={3} />
                  <AdminLocalizedFormField fieldKey="officeHours" label="Office Hours" legacyEntity={company ?? undefined} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AdminSettingsLayout>

      <div className="flex justify-end lg:hidden">
        <Button type="submit">Save Company Info</Button>
      </div>
    </>
  );
}

export function CompanyAdminForm({ company }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = useCallback(async () => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <form ref={formRef} action={updateCompanyInfo} className="space-y-6">
        <CompanyFormFields company={company} formRef={formRef} />
      </form>
    </AdminFormProvider>
  );
}
