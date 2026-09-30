"use client";

import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
} from "@/features/translation/workspace-entity-ids";

type FooterColumnHeadingFieldProps = {
  columnId: string;
  defaultHeading: string;
  onDefaultHeadingChange: (value: string) => void;
};

export function FooterColumnHeadingField({
  columnId,
  defaultHeading,
  onDefaultHeadingChange,
}: FooterColumnHeadingFieldProps) {
  return (
    <WorkspaceLocalizedField
      entityType="FooterColumn"
      entityId={makeFooterColumnEntityId(columnId)}
      field="heading"
      legacyEntity={{ heading: defaultHeading }}
      onDefaultLocaleChange={onDefaultHeadingChange}
    />
  );
}

type FooterColumnBodyFieldProps = {
  columnId: string;
  defaultBody: string;
  onDefaultBodyChange: (value: string) => void;
};

export function FooterColumnBodyField({
  columnId,
  defaultBody,
  onDefaultBodyChange,
}: FooterColumnBodyFieldProps) {
  return (
    <WorkspaceLocalizedField
      entityType="FooterColumn"
      entityId={makeFooterColumnEntityId(columnId)}
      field="body"
      legacyEntity={{ body: defaultBody }}
      multiline
      rows={4}
      onDefaultLocaleChange={onDefaultBodyChange}
    />
  );
}

type FooterLinkLabelFieldProps = {
  columnId: string;
  linkIndex: number;
  defaultLabel: string;
  label?: string;
  onDefaultLabelChange: (value: string) => void;
};

export function FooterLinkLabelField({
  columnId,
  linkIndex,
  defaultLabel,
  label,
  onDefaultLabelChange,
}: FooterLinkLabelFieldProps) {
  return (
    <WorkspaceLocalizedField
      entityType="FooterLink"
      entityId={makeFooterLinkEntityId(columnId, String(linkIndex))}
      field="label"
      label={label ?? `Link ${linkIndex + 1} label`}
      legacyEntity={{ label: defaultLabel }}
      onDefaultLocaleChange={onDefaultLabelChange}
    />
  );
}

type FooterCopyrightFieldProps = {
  field: "copyrightText" | "tagline";
  label: string;
  defaultValue: string;
  onDefaultChange: (value: string) => void;
};

export function FooterCopyrightField({
  field,
  label,
  defaultValue,
  onDefaultChange,
}: FooterCopyrightFieldProps) {
  const legacyKey = field === "copyrightText" ? "copyrightText" : "tagline";
  return (
    <WorkspaceLocalizedField
      entityType="Footer"
      entityId={makeFooterEntityId()}
      field={field}
      label={label}
      legacyEntity={{ [legacyKey]: defaultValue }}
      onDefaultLocaleChange={onDefaultChange}
    />
  );
}
