import { z } from "zod";

function formString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

const optionalFormString = z.preprocess(formString, z.string());

export const companyInfoSchema = z.object({
  name: z.preprocess(formString, z.string().trim().min(1, "Company name is required")),
  taglineEn: optionalFormString,
  taglineAr: optionalFormString,
  storyEn: optionalFormString,
  storyAr: optionalFormString,
  missionEn: optionalFormString,
  missionAr: optionalFormString,
  visionEn: optionalFormString,
  visionAr: optionalFormString,
  valuesEn: optionalFormString.default("[]"),
  valuesAr: optionalFormString.default("[]"),
  registrationNo: optionalFormString,
  licenseInfo: optionalFormString,
  addressEn: optionalFormString,
  addressAr: optionalFormString,
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
  officeHoursEn: optionalFormString,
  officeHoursAr: optionalFormString,
  socialLinks: optionalFormString.default("{}"),
  trustBadges: optionalFormString.default("[]"),
});
