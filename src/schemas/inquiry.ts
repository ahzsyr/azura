import { z } from "zod";
import { emailInputSchema } from "@/lib/security/email-input";

export const inquirySchema = z.object({
  type: z.enum(["GENERAL", "PACKAGE", "CONTENT", "VISA", "CONTACT"]),
  name: z.string().min(2, "Name is required").max(120),
  email: emailInputSchema,
  phone: z.string().max(32).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  contentItemId: z.string().max(64).optional(),
  /** @deprecated use contentItemId */
  packageId: z.string().max(64).optional(),
  locale: z.string().max(16),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
