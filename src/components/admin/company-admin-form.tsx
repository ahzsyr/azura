"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import type { CompanyInfoView } from "@/features/translation/admin-localized-view";
import { readAdminDefaultLocaleField } from "@/features/translation/admin-localized-view";
import { updateCompanyInfo } from "@/lib/actions/admin";
import { publishShell } from "@/lib/publish-shell.client";
import { saveIfNeededThenPublish } from "@/hooks/save-then-publish";
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";
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
import { SmartPhoneInput } from "@/features/forms/fxs/smart/adapters";

const TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "contact", label: "Contact" },
  { id: "schema", label: "Schema entity" },
  { id: "localization", label: "Localization" },
] as const;

type Props = {
  company: CompanyInfoView | null;
  /** Visitor/session country used for empty phone fields; saved values keep their own code. */
  defaultPhoneCountry?: string | null;
};

function CompanyFormFields({
  company,
  formRef,
  defaultPhoneCountry,
}: Props & { formRef: React.RefObject<HTMLFormElement | null> }) {
  const { setDirty } = useAdminForm();
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(company?.whatsapp ?? "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === tabParam) ? tabParam! : "general";

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`/admin/company?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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

      <AdminSettingsLayout
        tabs={[...TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layout="sidebar"
      >
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
                      <SmartPhoneInput
                        id="company-phone"
                        label="Phone"
                        value={phone}
                        onChange={setPhone}
                        variant="plain"
                        defaultCountry={defaultPhoneCountry}
                      />
                      <input type="hidden" name="phone" value={phone} readOnly />
                    </div>
                    <div className="space-y-2">
                      <SmartPhoneInput
                        id="company-whatsapp"
                        label="WhatsApp"
                        value={whatsapp}
                        onChange={setWhatsapp}
                        variant="plain"
                        defaultCountry={defaultPhoneCountry}
                      />
                      <input type="hidden" name="whatsapp" value={whatsapp} readOnly />
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

            {activeTab === "schema" && (
              <Card>
                <CardHeader>
                  <CardTitle>Schema entity signals</CardTitle>
                  <CardDescription>
                    Verified business data emitted in Organization JSON-LD only when provided.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AdminLocalizedFormField
                    fieldKey="legalName"
                    label="Legal name"
                    entityType="CompanyInfo"
                    entityId="default"
                    legacyEntity={company ?? undefined}
                  />
                  <AdminLocalizedFormField
                    fieldKey="schemaDescription"
                    label="Business description"
                    entityType="CompanyInfo"
                    entityId="default"
                    legacyEntity={company ?? undefined}
                    multiline
                    rows={3}
                  />
                  <AdminLocalizedFormField
                    fieldKey="foundingDate"
                    label="Founded date / year"
                    entityType="CompanyInfo"
                    entityId="default"
                    legacyEntity={company ?? undefined}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminLocalizedFormField
                      fieldKey="latitude"
                      label="Latitude"
                      entityType="CompanyInfo"
                      entityId="default"
                      legacyEntity={company ?? undefined}
                    />
                    <AdminLocalizedFormField
                      fieldKey="longitude"
                      label="Longitude"
                      entityType="CompanyInfo"
                      entityId="default"
                      legacyEntity={company ?? undefined}
                    />
                  </div>
                  <AdminLocalizedFormField
                    fieldKey="areaServed"
                    label="Area served"
                    entityType="CompanyInfo"
                    entityId="default"
                    legacyEntity={company ?? undefined}
                  />
                  <AdminLocalizedFormField
                    fieldKey="knowsAbout"
                    label="Knows about (JSON array or comma-separated)"
                    entityType="CompanyInfo"
                    entityId="default"
                    legacyEntity={company ?? undefined}
                    multiline
                    rows={3}
                  />
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
        <Button type="submit">Save</Button>
      </div>
    </>
  );
}

export function CompanyAdminForm({ company, defaultPhoneCountry }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = useCallback(async () => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return false;
    await updateCompanyInfo(new FormData(form));
    return true;
  }, []);

  const handleCancel = useCallback(() => {
    formRef.current?.reset();
  }, []);

  const handlePublish = useCallback(async () => {
    await saveIfNeededThenPublish(handleSave, () => publishShell("site-settings"));
  }, [handleSave]);

  return (
    <AdminFormProvider
      onSave={handleSave}
      onPublish={handlePublish}
      onCancel={handleCancel}
      canCancel
      canPublish
      trackFormId="company-admin-form"
    >
      <AdminPageConfigRegistrar configKey="settingsSavePublish" />
      <form
        ref={formRef}
        id="company-admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-6"
      >
        <CompanyFormFields
          company={company}
          formRef={formRef}
          defaultPhoneCountry={defaultPhoneCountry}
        />
      </form>
    </AdminFormProvider>
  );
}
