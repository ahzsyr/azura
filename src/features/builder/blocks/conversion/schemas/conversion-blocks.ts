import { z } from "zod";

export const stickyCtaPropsSchema = z.object({
  title: z.string().default(""),
  message: z.string().default(""),
  primaryButton: z.string().default("Get started"),
  primaryHref: z.string().default("/contact"),
  secondaryButton: z.string().default(""),
  secondaryHref: z.string().default(""),
  variant: z.enum(["bar", "banner", "fab"]).default("bar"),
  position: z.enum(["top", "bottom"]).default("bottom"),
  mobileVariant: z.enum(["bar", "banner", "fab"]).optional(),
  trigger: z.enum(["always", "scrollPercent", "delayMs", "exitIntent"]).default("scrollPercent"),
  triggerValue: z.coerce.number().default(25),
  dismissible: z.boolean().default(true),
  dismissKey: z.string().default("sticky-cta"),
});

export const leadFormPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  templateId: z.string().default(""),
  incentive: z.string().default(""),
  successMessage: z.string().default("Thank you! We will be in touch."),
});

export const contactFormBuilderPropsSchema = z.object({
  title: z.string().default(""),
  templateId: z.string().default(""),
  layout: z.enum(["stacked", "inline", "twoColumn"]).default("stacked"),
  successMessage: z.string().default("Message sent successfully."),
  redirectUrl: z.string().default(""),
});

export const multiStepFormPropsSchema = z.object({
  title: z.string().default(""),
  templateId: z.string().default(""),
  progressStyle: z.enum(["bar", "steps", "dots"]).default("bar"),
  allowBack: z.boolean().default(true),
  saveAndResume: z.boolean().default(true),
  successMessage: z.string().default("Submission complete."),
});

export const newsletterSignupPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  layout: z.enum(["inline", "card", "banner"]).default("inline"),
  segment: z.string().default("default"),
  incentive: z.string().default(""),
  doubleOptIn: z.boolean().default(true),
  showNameField: z.boolean().default(false),
  successMessage: z.string().default("Check your email to confirm."),
  pendingMessage: z.string().default("Confirmation email sent."),
  webhookUrl: z.string().default(""),
});

export const downloadGatePropsSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  mediaAssetId: z.string().default(""),
  fileLabel: z.string().default("Download"),
  successMessage: z.string().default("Download unlocked."),
  unlockMethod: z.enum(["formTemplate", "newsletter", "externalUrl"]).default("formTemplate"),
  templateId: z.string().default(""),
  newsletterSegment: z.string().default("default"),
  externalUrl: z.string().default(""),
  expiryHours: z.coerce.number().min(1).max(720).default(72),
});

export type StickyCtaProps = z.infer<typeof stickyCtaPropsSchema>;
export type LeadFormProps = z.infer<typeof leadFormPropsSchema>;
export type ContactFormBuilderProps = z.infer<typeof contactFormBuilderPropsSchema>;
export type MultiStepFormProps = z.infer<typeof multiStepFormPropsSchema>;
export type NewsletterSignupProps = z.infer<typeof newsletterSignupPropsSchema>;
export type DownloadGateProps = z.infer<typeof downloadGatePropsSchema>;
