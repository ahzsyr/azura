import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.string().min(2).max(10).default("en"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(128),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
