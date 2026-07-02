import { z } from "zod";

export const inquirySchema = z.object({
  type: z.enum(["GENERAL", "PACKAGE", "CONTENT", "VISA", "CONTACT"]),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  contentItemId: z.string().optional(),
  /** @deprecated use contentItemId */
  packageId: z.string().optional(),
  locale: z.string(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
