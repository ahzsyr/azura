import { z } from "zod";

function formString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

const optionalFormString = z.preprocess(formString, z.string());

export const companyInfoSchema = z.object({
  name: z.preprocess(formString, z.string().trim().min(1, "Company name is required")),
  tagline: optionalFormString,
  story: optionalFormString,
  mission: optionalFormString,
  vision: optionalFormString,
  values: optionalFormString.default("[]"),
  registrationNo: optionalFormString,
  licenseInfo: optionalFormString,
  address: optionalFormString,
  phone: optionalFormString,
  whatsapp: optionalFormString,
  email: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .refine((value) => value === "" || z.string().email().safeParse(value).success, {
        message: "Invalid email address",
      }),
  ),
  officeHours: optionalFormString,
  socialLinks: optionalFormString.default("{}"),
  trustBadges: optionalFormString.default("[]"),
});
