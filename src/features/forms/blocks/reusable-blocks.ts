import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { SchemaNode } from "@/platform/schema-ui/schema/schema-node";
import type { ValueBinding } from "@/platform/schema-ui/schema/value-binding";

export type ReusableBlockId =
  | "contact"
  | "address"
  | "company"
  | "gdpr"
  | "newsletter";

export type ReusableBlock = {
  id: ReusableBlockId;
  name: string;
  description: string;
};

export const REUSABLE_BLOCKS: ReusableBlock[] = [
  { id: "contact", name: "Contact Information", description: "Name, email, phone" },
  { id: "address", name: "Address Block", description: "Street, city, country" },
  { id: "company", name: "Company Information", description: "Company and role" },
  { id: "gdpr", name: "GDPR Consent", description: "Consent checkbox" },
  { id: "newsletter", name: "Newsletter Opt-in", description: "Email + marketing consent" },
];

function binding(
  bindingId: string,
  componentType: string,
  label: string,
  required = false,
  data: Record<string, unknown> = {},
): ValueBinding {
  return {
    bindingId,
    componentType,
    version: 1,
    presentation: { label },
    behavior: { required },
    data,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Expand a reusable block into bindings + layout nodes to append. */
export function expandReusableBlock(id: ReusableBlockId): {
  bindings: ValueBinding[];
  nodes: SchemaNode[];
} {
  switch (id) {
    case "contact": {
      const nameId = uid("name");
      const emailId = uid("email");
      const phoneId = uid("phone");
      return {
        bindings: [
          binding(nameId, "textField", "Full name", true),
          binding(emailId, "emailField", "Email", true),
          binding(phoneId, "phoneField", "Phone"),
        ],
        nodes: [
          {
            kind: "layout",
            type: "section",
            id: uid("section"),
            props: { title: "Contact" },
            children: [
              {
                kind: "layout",
                type: "grid",
                id: uid("grid"),
                props: { columns: 2 },
                children: [
                  { kind: "binding", bindingId: nameId },
                  { kind: "binding", bindingId: emailId },
                ],
              },
              { kind: "binding", bindingId: phoneId },
            ],
          },
        ],
      };
    }
    case "address": {
      const street = uid("street");
      const city = uid("city");
      const country = uid("country");
      return {
        bindings: [
          binding(street, "textField", "Street", true),
          binding(city, "textField", "City", true),
          binding(country, "textField", "Country", true),
        ],
        nodes: [
          {
            kind: "layout",
            type: "section",
            id: uid("section"),
            props: { title: "Address" },
            children: [
              { kind: "binding", bindingId: street },
              {
                kind: "layout",
                type: "grid",
                id: uid("grid"),
                props: { columns: 2 },
                children: [
                  { kind: "binding", bindingId: city },
                  { kind: "binding", bindingId: country },
                ],
              },
            ],
          },
        ],
      };
    }
    case "company": {
      const company = uid("company");
      const role = uid("role");
      return {
        bindings: [
          binding(company, "textField", "Company"),
          binding(role, "textField", "Job title"),
        ],
        nodes: [
          {
            kind: "layout",
            type: "section",
            id: uid("section"),
            props: { title: "Company" },
            children: [
              {
                kind: "layout",
                type: "grid",
                id: uid("grid"),
                props: { columns: 2 },
                children: [
                  { kind: "binding", bindingId: company },
                  { kind: "binding", bindingId: role },
                ],
              },
            ],
          },
        ],
      };
    }
    case "gdpr": {
      const consent = uid("gdpr");
      return {
        bindings: [
          binding(consent, "checkboxField", "I agree to the privacy policy", true),
        ],
        nodes: [{ kind: "binding", bindingId: consent }],
      };
    }
    case "newsletter": {
      const email = uid("newsletter-email");
      const optin = uid("newsletter-optin");
      return {
        bindings: [
          binding(email, "emailField", "Email", true),
          binding(optin, "checkboxField", "Send me updates", true),
        ],
        nodes: [
          {
            kind: "layout",
            type: "section",
            id: uid("section"),
            props: { title: "Newsletter" },
            children: [
              { kind: "binding", bindingId: email },
              { kind: "binding", bindingId: optin },
            ],
          },
        ],
      };
    }
  }
}

export function insertReusableBlock(
  document: SchemaDocument,
  blockId: ReusableBlockId,
): SchemaDocument {
  const frag = expandReusableBlock(blockId);
  return {
    ...document,
    bindings: [...document.bindings, ...frag.bindings],
    nodes: [...document.nodes, ...frag.nodes],
  };
}
