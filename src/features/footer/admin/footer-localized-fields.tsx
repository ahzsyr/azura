"use client";

import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import {
  makeFooterColumnEntityId,
  makeFooterContactItemEntityId,
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
  label?: string;
};

export function FooterColumnBodyField({
  columnId,
  defaultBody,
  onDefaultBodyChange,
  label = "Body",
}: FooterColumnBodyFieldProps) {
  return (
    <WorkspaceLocalizedField
      entityType="FooterColumn"
      entityId={makeFooterColumnEntityId(columnId)}
      field={label === "Custom content" ? "customContent" : "body"}
      label={label}
      legacyEntity={{ [label === "Custom content" ? "customContent" : "body"]: defaultBody }}
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

type FooterContactItemTextFieldProps = {
  columnId: string;
  itemId: string;
  field: "label" | "value";
  label: string;
  defaultValue: string;
  multiline?: boolean;
  rows?: number;
  onDefaultChange: (value: string) => void;
};

export function FooterContactItemTextField({
  columnId,
  itemId,
  field,
  label,
  defaultValue,
  multiline,
  rows,
  onDefaultChange,
}: FooterContactItemTextFieldProps) {
  return (
    <WorkspaceLocalizedField
      entityType="FooterContactItem"
      entityId={makeFooterContactItemEntityId(columnId, itemId)}
      field={field}
      label={label}
      legacyEntity={{ [field]: defaultValue }}
      multiline={multiline}
      rows={rows}
      onDefaultLocaleChange={onDefaultChange}
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
