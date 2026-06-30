import { z } from "zod";

export const setupCompleteSchema = z.object({
  siteName: z.string().min(2).max(120),
  tagline: z.string().max(200).optional(),
  siteUrl: z.preprocess(
    (val) => (typeof val === "string" && !val.trim() ? undefined : val),
    z.string().url().optional()
  ),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
  adminName: z.string().min(1).max(80).default("Admin"),
  registrationEnabled: z.boolean().default(true),
  installMode: z.enum(["blank", "demo-brt", "demo-safar"]).default("blank"),
  setupToken: z.string().optional(),
});

export type SetupCompleteInput = z.infer<typeof setupCompleteSchema>;

export const updateAdminCredentialsSchema = z
  .object({
    currentPassword: z.string().min(1),
    newEmail: z.string().email().optional(),
    newPassword: z.string().min(8).max(128).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
      return Boolean(data.newEmail || data.newPassword);
    },
    { message: "Provide new email and/or password; passwords must match" }
  );

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((val) => {
    const d = new Date(`${val}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    if (d >= now) return false;
    const minAge = new Date(now);
    minAge.setUTCFullYear(minAge.getUTCFullYear() - 18);
    return d <= minAge;
  }, "You must be at least 18 years old");

export const customerProfileFieldsSchema = z.object({
  phone: z.string().min(6).max(32),
  dateOfBirth: dateOfBirthSchema,
  addressLine1: z.string().min(2).max(120),
  addressLine2: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().min(2).max(80),
  marketingOptIn: z.boolean().optional().default(false),
});

export const registerSchema = customerProfileFieldsSchema.extend({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const updateCustomerProfileSchema = customerProfileFieldsSchema
  .partial()
  .extend({
    name: z.string().min(2).max(80).optional(),
  });

export const updateProfileSchema = updateCustomerProfileSchema
  .extend({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(128).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: "Current password required to set a new password" }
  );

export const adminUpdateCustomerSchema = updateCustomerProfileSchema;

export const adminSetPasswordSchema = z
  .object({
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match",
  });

export function parseDateOfBirth(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value === "") return null;
  return value;
}
