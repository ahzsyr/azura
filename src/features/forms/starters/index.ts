import type { FormTemplateCategory } from "@prisma/client";
import type { DocumentExtensions } from "@/features/forms/lib/document-envelope";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { ValueBinding } from "@/platform/schema-ui/schema/value-binding";
import type { SchemaNode } from "@/platform/schema-ui/schema/schema-node";

export type FormStarterId =
  | "lead"
  | "contact"
  | "support"
  | "quote"
  | "newsletter"
  | "survey"
  | "registration"
  | "download-gate"
  | "blank";

export type FormStarter = {
  id: FormStarterId;
  name: string;
  description: string;
  category: FormTemplateCategory;
  suggestedSlug: string;
};

export const FORM_STARTERS: FormStarter[] = [
  { id: "lead", name: "Lead Generation", description: "Capture name, email, phone, and company with scoring.", category: "LEAD", suggestedSlug: "lead-form" },
  { id: "contact", name: "Contact", description: "Simple contact form with auto-reply.", category: "CONTACT", suggestedSlug: "contact-form" },
  { id: "support", name: "Support", description: "Support ticket with priority and topic.", category: "GENERAL", suggestedSlug: "support-form" },
  { id: "quote", name: "Quote Request", description: "RFQ-style request with budget and timeline.", category: "LEAD", suggestedSlug: "quote-request" },
  { id: "newsletter", name: "Newsletter", description: "Email signup with consent.", category: "GENERAL", suggestedSlug: "newsletter-signup" },
  { id: "survey", name: "Survey", description: "Satisfaction rating and feedback.", category: "SURVEY", suggestedSlug: "feedback-survey" },
  { id: "registration", name: "Registration", description: "Multi-step event or account registration.", category: "MULTI_STEP", suggestedSlug: "registration" },
  { id: "download-gate", name: "Download Gate", description: "Lead fields for gated content unlock.", category: "LEAD", suggestedSlug: "download-gate" },
  { id: "blank", name: "Blank Form", description: "Start from an empty canvas.", category: "GENERAL", suggestedSlug: "untitled-form" },
];

function binding(
  bindingId: string,
  componentType: string,
  label: string,
  required = false,
  extra: Partial<ValueBinding> = {},
): ValueBinding {
  return {
    bindingId,
    componentType,
    version: 1,
    presentation: { label, ...(extra.presentation ?? {}) },
    behavior: { required, ...(extra.behavior ?? {}) },
    data: { ...(extra.data ?? {}) },
  };
}

function section(id: string, title: string, children: SchemaNode[]): SchemaNode {
  return { kind: "layout", type: "section", id, props: { title }, children };
}

function grid(id: string, columns: number, children: SchemaNode[]): SchemaNode {
  return { kind: "layout", type: "grid", id, props: { columns }, children };
}

function heading(id: string, text: string): SchemaNode {
  return { kind: "content", type: "heading", id, props: { text, level: 2 } };
}

function paragraph(id: string, text: string): SchemaNode {
  return { kind: "content", type: "paragraph", id, props: { text } };
}

function b(id: string): SchemaNode {
  return { kind: "binding", bindingId: id };
}

function doc(
  bindings: ValueBinding[],
  nodes: SchemaNode[],
  extensions: DocumentExtensions = {},
  steps?: SchemaDocument["steps"],
): { document: SchemaDocument; extensions: DocumentExtensions } {
  return {
    document: {
      definitionVersion: 2,
      bindings,
      nodes,
      steps,
      rules: [],
      theme: {
        spacing: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
        radius: { sm: "0.375rem", md: "0.5rem", lg: "0.75rem" },
        inputHeight: "2.5rem",
        labelStyle: "above",
        buttonVariant: "default",
      },
    },
    extensions: {
      notifications: { receiverEmails: [], sendToSubmitter: false },
      webhooks: [],
      ...extensions,
    },
  };
}

export function getFormStarter(id: FormStarterId): FormStarter {
  return FORM_STARTERS.find((s) => s.id === id) ?? FORM_STARTERS[FORM_STARTERS.length - 1]!;
}

export function buildStarterPack(id: FormStarterId): {
  document: SchemaDocument;
  extensions: DocumentExtensions;
} {
  switch (id) {
    case "lead":
      return doc(
        [
          binding("name", "textField", "Full name", true),
          binding("email", "emailField", "Work email", true),
          binding("phone", "phoneField", "Phone"),
          binding("company", "textField", "Company"),
        ],
        [
          heading("h1", "Get in touch"),
          paragraph("p1", "Tell us about your project and we will follow up shortly."),
          section("s1", "Contact details", [
            grid("g1", 2, [b("name"), b("email")]),
            grid("g2", 2, [b("phone"), b("company")]),
          ]),
          paragraph("success", "Thanks — we received your request."),
        ],
        {
          scoringRules: [{ fieldId: "company", match: ".+", points: 10 }],
          notifications: { receiverEmails: [], sendToSubmitter: false },
          automationRules: [
            {
              id: "auto-lead",
              event: "interaction.submitted",
              actions: [{ type: "tag", tags: ["lead"] }],
            },
          ],
        },
      );
    case "contact":
      return doc(
        [
          binding("name", "textField", "Full name", true),
          binding("email", "emailField", "Email address", true),
          binding("phone", "phoneField", "Phone"),
          binding("message", "textareaField", "Message", true),
        ],
        [
          heading("h1", "Need help?"),
          paragraph("p1", "Tell us about your project. We'll reply within one business day."),
          section("s1", "Contact information", [
            grid("g1", 2, [b("name"), b("email")]),
            b("phone"),
          ]),
          section("s2", "Project details", [b("message")]),
        ],
        { notifications: { receiverEmails: [], sendToSubmitter: true } },
      );
    case "support":
      return doc(
        [
          binding("name", "textField", "Name", true),
          binding("email", "emailField", "Email", true),
          binding("topic", "selectField", "Topic", true, {
            data: {
              options: [
                { value: "billing", label: "Billing" },
                { value: "technical", label: "Technical" },
                { value: "other", label: "Other" },
              ],
            },
          }),
          binding("priority", "selectField", "Priority", false, {
            data: {
              options: [
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ],
            },
          }),
          binding("details", "textareaField", "Details", true),
        ],
        [
          heading("h1", "Support request"),
          section("s1", "About you", [grid("g1", 2, [b("name"), b("email")])]),
          section("s2", "Issue", [grid("g2", 2, [b("topic"), b("priority")]), b("details")]),
        ],
        {
          pipeline: { pipelineType: "support", defaultTags: ["support"] },
          notifications: { receiverEmails: [], sendToSubmitter: true },
        },
      );
    case "quote":
      return doc(
        [
          binding("name", "textField", "Name", true),
          binding("email", "emailField", "Email", true),
          binding("company", "textField", "Company", true),
          binding("budget", "selectField", "Budget", false, {
            data: {
              options: [
                { value: "under-5k", label: "Under $5k" },
                { value: "5k-25k", label: "$5k–$25k" },
                { value: "25k-plus", label: "$25k+" },
              ],
            },
          }),
          binding("timeline", "textField", "Timeline"),
          binding("details", "textareaField", "Project details", true),
        ],
        [
          heading("h1", "Request a quote"),
          section("s1", "Contact", [grid("g1", 2, [b("name"), b("email")]), b("company")]),
          section("s2", "Project", [grid("g2", 2, [b("budget"), b("timeline")]), b("details")]),
        ],
        {
          scoringRules: [
            { fieldId: "budget", match: "25k-plus", points: 25 },
            { fieldId: "budget", match: "5k-25k", points: 10 },
          ],
          notifications: { receiverEmails: [], sendToSubmitter: true },
        },
      );
    case "newsletter":
      return doc(
        [
          binding("email", "emailField", "Email", true),
          binding("name", "textField", "First name"),
          binding("consent", "checkboxField", "I agree to receive updates", true),
        ],
        [
          heading("h1", "Stay in the loop"),
          paragraph("p1", "Subscribe for product news and offers."),
          section("s1", "", [b("email"), b("name"), b("consent")]),
        ],
        { notifications: { receiverEmails: [], sendToSubmitter: false } },
      );
    case "survey":
      return doc(
        [
          binding("rating", "numberField", "How satisfied are you? (1–5)", true, {
            data: { min: 1, max: 5 },
          }),
          binding("feedback", "textareaField", "Additional feedback"),
        ],
        [
          heading("h1", "Quick feedback"),
          section("s1", "", [b("rating"), b("feedback")]),
        ],
        { notifications: { receiverEmails: [], sendToSubmitter: false } },
      );
    case "registration":
      return doc(
        [
          binding("name", "textField", "Full name", true),
          binding("email", "emailField", "Email", true),
          binding("phone", "phoneField", "Phone"),
          binding("company", "textField", "Company"),
          binding("role", "textField", "Job title"),
          binding("notes", "textareaField", "Notes"),
        ],
        [
          heading("h1", "Register"),
          section("s1", "Personal", [grid("g1", 2, [b("name"), b("email")]), b("phone")]),
          section("s2", "Work", [grid("g2", 2, [b("company"), b("role")])]),
          section("s3", "More", [b("notes")]),
        ],
        { notifications: { receiverEmails: [], sendToSubmitter: true } },
        [
          { id: "step1", title: "Personal", bindingIds: ["name", "email", "phone"] },
          { id: "step2", title: "Company", bindingIds: ["company", "role"] },
          { id: "step3", title: "Details", bindingIds: ["notes"] },
        ],
      );
    case "download-gate":
      return doc(
        [
          binding("name", "textField", "Name", true),
          binding("email", "emailField", "Work email", true),
          binding("company", "textField", "Company"),
        ],
        [
          heading("h1", "Unlock this download"),
          paragraph("p1", "Enter your details to access the file."),
          section("s1", "", [b("name"), b("email"), b("company")]),
        ],
        {
          scoringRules: [{ fieldId: "company", match: ".+", points: 5 }],
          notifications: { receiverEmails: [], sendToSubmitter: false },
          automationRules: [
            {
              id: "auto-download",
              event: "interaction.submitted",
              actions: [{ type: "tag", tags: ["download-gate"] }],
            },
          ],
        },
      );
    case "blank":
    default:
      return doc([], [], { notifications: { receiverEmails: [], sendToSubmitter: false } });
  }
}
