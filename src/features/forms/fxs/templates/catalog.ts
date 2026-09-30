import type { FormTemplateCategory } from "@prisma/client";
import type { FxsExperienceConfig, FxsThemePreset } from "../types";

export type FxsTemplateFamily =
  | "marketing"
  | "sales"
  | "support"
  | "hr"
  | "customer"
  | "operations";

export type FxsTemplateDefinition = {
  id: string;
  name: string;
  family: FxsTemplateFamily;
  description: string;
  category: FormTemplateCategory;
  /** Maps to existing starter id when available. */
  starterId?:
    | "lead"
    | "contact"
    | "support"
    | "quote"
    | "newsletter"
    | "survey"
    | "registration"
    | "download-gate"
    | "blank";
  experience: FxsExperienceConfig;
  tags?: string[];
};

const modernContact: FxsExperienceConfig = {
  title: "Need help?",
  description: "Tell us about your project. We'll reply within one business day.",
  trustItems: [
    { id: "t1", label: "Response within 24 hours" },
    { id: "t2", label: "No obligation" },
    { id: "t3", label: "Your information stays private" },
  ],
  estimatedMinutes: 2,
  layoutMode: "split",
  theme: "modern",
  fieldMode: "classic",
  enableLiveSummary: true,
  enableErrorSummary: true,
  estimatedResponse: "Within one business day",
  successTitle: "Thank you",
  successDescription: "We've emailed you a confirmation.",
};

export const FXS_TEMPLATE_CATALOG: FxsTemplateDefinition[] = [
  // Marketing
  {
    id: "contact-us",
    name: "Contact Us",
    family: "marketing",
    description: "Premium split-layout contact form with trust signals.",
    category: "CONTACT",
    starterId: "contact",
    experience: { ...modernContact, layoutMode: "sectionCard" },
    tags: ["public", "lead"],
  },
  {
    id: "request-quote",
    name: "Request a Quote",
    family: "marketing",
    description: "RFQ with project sections and live summary.",
    category: "LEAD",
    starterId: "quote",
    experience: {
      ...modernContact,
      title: "Request a quote",
      description: "Share project details and we'll prepare a proposal.",
      theme: "enterprise",
      layoutMode: "sectionCard",
      estimatedMinutes: 4,
    },
  },
  {
    id: "demo-request",
    name: "Demo Request",
    family: "marketing",
    description: "Book a product demo with qualification fields.",
    category: "LEAD",
    starterId: "lead",
    experience: {
      ...modernContact,
      title: "Book a demo",
      description: "See the platform in action with our team.",
      theme: "modern",
    },
  },
  {
    id: "newsletter",
    name: "Newsletter Subscription",
    family: "marketing",
    description: "Compact email capture with consent.",
    category: "GENERAL",
    starterId: "newsletter",
    experience: {
      title: "Stay in the loop",
      description: "Product news and offers — unsubscribe anytime.",
      layoutMode: "compact",
      theme: "minimal",
      showHero: true,
      estimatedMinutes: 1,
    },
  },
  {
    id: "lead-capture",
    name: "Lead Capture Landing Page",
    family: "marketing",
    description: "High-converting split lead form for campaigns.",
    category: "LEAD",
    starterId: "lead",
    experience: {
      ...modernContact,
      title: "Get started",
      theme: "modern",
      layoutMode: "split",
    },
  },
  // Sales
  {
    id: "product-enquiry",
    name: "Product Enquiry",
    family: "sales",
    description: "Product-specific inquiry with attachments.",
    category: "LEAD",
    starterId: "lead",
    experience: {
      ...modernContact,
      title: "Product enquiry",
      enableEnhancedUpload: true,
      theme: "enterprise",
    },
  },
  {
    id: "partner-application",
    name: "Partner Application",
    family: "sales",
    description: "Multi-step partner onboarding.",
    category: "MULTI_STEP",
    starterId: "registration",
    experience: {
      title: "Partner with us",
      description: "Tell us about your organization.",
      layoutMode: "wizard",
      theme: "enterprise",
      progressStyle: "steps",
      enableLiveSummary: true,
      estimatedMinutes: 8,
    },
  },
  {
    id: "distributor-registration",
    name: "Distributor Registration",
    family: "sales",
    description: "Region and company qualification flow.",
    category: "MULTI_STEP",
    starterId: "registration",
    experience: {
      title: "Distributor registration",
      theme: "enterprise",
      layoutMode: "default",
      progressStyle: "bar",
      enableSmartInputs: true,
    },
  },
  // Support
  {
    id: "technical-support",
    name: "Technical Support",
    family: "support",
    description: "Support ticket with priority and topic.",
    category: "GENERAL",
    starterId: "support",
    experience: {
      title: "Technical support",
      description: "Describe the issue and we'll triage promptly.",
      theme: "enterprise",
      layoutMode: "default",
      enableEnhancedUpload: true,
      estimatedResponse: "Within one business day",
    },
  },
  {
    id: "warranty",
    name: "Warranty Registration",
    family: "support",
    description: "Product warranty capture.",
    category: "GENERAL",
    starterId: "support",
    experience: { title: "Warranty registration", theme: "minimal", layoutMode: "centered" },
  },
  {
    id: "rma",
    name: "RMA / Return Request",
    family: "support",
    description: "Return merchandise authorization form.",
    category: "GENERAL",
    starterId: "support",
    experience: {
      title: "Return request",
      theme: "enterprise",
      enableEnhancedUpload: true,
    },
  },
  {
    id: "complaint",
    name: "Complaint Form",
    family: "support",
    description: "Formal complaint with escalation path.",
    category: "GENERAL",
    starterId: "support",
    experience: { title: "Share your concern", theme: "minimal", layoutMode: "centered" },
  },
  // HR
  {
    id: "job-application",
    name: "Job Application",
    family: "hr",
    description: "Multi-step application with resume upload.",
    category: "MULTI_STEP",
    starterId: "registration",
    experience: {
      title: "Apply now",
      description: "Upload your resume and tell us about your experience.",
      theme: "modern",
      progressStyle: "steps",
      enableEnhancedUpload: true,
      enableLiveSummary: true,
      estimatedMinutes: 10,
    },
  },
  {
    id: "careers",
    name: "Careers Interest",
    family: "hr",
    description: "General careers interest form.",
    category: "GENERAL",
    starterId: "contact",
    experience: { title: "Join our team", theme: "modern", layoutMode: "split" },
  },
  {
    id: "interview-booking",
    name: "Interview Booking",
    family: "hr",
    description: "Schedule an interview slot.",
    category: "GENERAL",
    starterId: "contact",
    experience: { title: "Book an interview", theme: "conversational", layoutMode: "centered" },
  },
  // Customer
  {
    id: "account-registration",
    name: "Account Registration",
    family: "customer",
    description: "Wizard-style account signup.",
    category: "MULTI_STEP",
    starterId: "registration",
    experience: {
      title: "Create your account",
      theme: "modern",
      progressStyle: "bar",
      layoutMode: "wizard",
      estimatedMinutes: 3,
    },
  },
  {
    id: "profile-editor",
    name: "Profile Editor",
    family: "customer",
    description: "Account profile fields.",
    category: "GENERAL",
    starterId: "blank",
    experience: { title: "Your profile", theme: "minimal", layoutMode: "default" },
  },
  {
    id: "password-reset",
    name: "Password Reset",
    family: "customer",
    description: "Secure password reset.",
    category: "GENERAL",
    starterId: "blank",
    experience: { title: "Reset password", theme: "minimal", layoutMode: "centered", showHero: true },
  },
  {
    id: "address-book",
    name: "Address Form",
    family: "customer",
    description: "Address capture with country search.",
    category: "GENERAL",
    starterId: "blank",
    experience: {
      title: "Shipping address",
      theme: "minimal",
      enableSmartInputs: true,
    },
  },
  // Operations
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    family: "operations",
    description: "Schedule a service appointment.",
    category: "GENERAL",
    starterId: "contact",
    experience: { title: "Book an appointment", theme: "modern", layoutMode: "split" },
  },
  {
    id: "survey",
    name: "Survey",
    family: "operations",
    description: "Conversational feedback survey.",
    category: "SURVEY",
    starterId: "survey",
    experience: {
      title: "Quick feedback",
      theme: "conversational",
      layoutMode: "conversational",
      progressStyle: "dots",
    },
  },
  {
    id: "customer-feedback",
    name: "Customer Feedback",
    family: "operations",
    description: "General satisfaction form.",
    category: "SURVEY",
    starterId: "survey",
    experience: { title: "We value your feedback", theme: "modern", layoutMode: "centered" },
  },
  {
    id: "service-request",
    name: "Service Request",
    family: "operations",
    description: "Field service / maintenance request.",
    category: "GENERAL",
    starterId: "support",
    experience: {
      title: "Request service",
      theme: "enterprise",
      layoutMode: "sidebar",
      enableEnhancedUpload: true,
      enableLiveSummary: true,
    },
  },
  {
    id: "multi-step-wizard",
    name: "Multi-Step Wizard",
    family: "operations",
    description: "Generic wizard shell with review step.",
    category: "MULTI_STEP",
    starterId: "registration",
    experience: {
      title: "Complete this form",
      theme: "modern",
      progressStyle: "breadcrumb",
      enableLiveSummary: true,
      layoutMode: "default",
    },
  },
  {
    id: "conversational-questionnaire",
    name: "Conversational Questionnaire",
    family: "operations",
    description: "One question at a time experience.",
    category: "SURVEY",
    starterId: "survey",
    experience: {
      title: "A few quick questions",
      theme: "conversational",
      layoutMode: "conversational",
      progressStyle: "dots",
    },
  },
];

export function listTemplatesByFamily(family: FxsTemplateFamily): FxsTemplateDefinition[] {
  return FXS_TEMPLATE_CATALOG.filter((t) => t.family === family);
}

export function getFxsTemplate(id: string): FxsTemplateDefinition | undefined {
  return FXS_TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function defaultThemeForFamily(family: FxsTemplateFamily): FxsThemePreset {
  switch (family) {
    case "support":
    case "sales":
      return "enterprise";
    case "operations":
      return "conversational";
    case "customer":
      return "minimal";
    default:
      return "modern";
  }
}
