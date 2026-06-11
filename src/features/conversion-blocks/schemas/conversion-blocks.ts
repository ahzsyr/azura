import { z } from "zod";

export const stickyCtaPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  messageEn: z.string().default(""),
  messageAr: z.string().default(""),
  primaryButtonEn: z.string().default("Get started"),
  primaryButtonAr: z.string().default("ابدأ الآن"),
  primaryHref: z.string().default("/contact"),
  secondaryButtonEn: z.string().default(""),
  secondaryButtonAr: z.string().default(""),
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
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  templateId: z.string().default(""),
  incentiveEn: z.string().default(""),
  incentiveAr: z.string().default(""),
  successMessageEn: z.string().default("Thank you! We will be in touch."),
  successMessageAr: z.string().default("شكراً! سنتواصل معك قريباً."),
});

export const contactFormBuilderPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  templateId: z.string().default(""),
  layout: z.enum(["stacked", "inline", "twoColumn"]).default("stacked"),
  successMessageEn: z.string().default("Message sent successfully."),
  successMessageAr: z.string().default("تم إرسال رسالتك بنجاح."),
  redirectUrl: z.string().default(""),
});

export const multiStepFormPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  templateId: z.string().default(""),
  progressStyle: z.enum(["bar", "steps", "dots"]).default("bar"),
  allowBack: z.boolean().default(true),
  saveAndResume: z.boolean().default(true),
  successMessageEn: z.string().default("Submission complete."),
  successMessageAr: z.string().default("تم الإرسال بنجاح."),
});

export const newsletterSignupPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  layout: z.enum(["inline", "card", "banner"]).default("inline"),
  segment: z.string().default("default"),
  incentiveEn: z.string().default(""),
  incentiveAr: z.string().default(""),
  doubleOptIn: z.boolean().default(true),
  showNameField: z.boolean().default(false),
  successMessageEn: z.string().default("Check your email to confirm."),
  successMessageAr: z.string().default("تحقق من بريدك لتأكيد الاشتراك."),
  pendingMessageEn: z.string().default("Confirmation email sent."),
  pendingMessageAr: z.string().default("تم إرسال رسالة التأكيد."),
  webhookUrl: z.string().default(""),
});

export const downloadGatePropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  descriptionEn: z.string().default(""),
  descriptionAr: z.string().default(""),
  mediaAssetId: z.string().default(""),
  fileLabelEn: z.string().default("Download"),
  fileLabelAr: z.string().default("تحميل"),
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
