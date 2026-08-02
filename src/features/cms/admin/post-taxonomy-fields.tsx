"use client";

import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type NameFieldProps = {
  required?: boolean;
};

export function PostTaxonomyNameField({ required }: NameFieldProps) {
  return <AdminLocalizedFormField fieldKey="name" label="Name" required={required} />;
}

export function PostAuthorBioField() {
  return <AdminLocalizedFormField fieldKey="bio" label="Bio" multiline rows={3} />;
}
