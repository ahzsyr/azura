import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  adminSetPasswordSchema,
  adminUpdateCustomerSchema,
  emptyToNull,
  parseDateOfBirth,
} from "@/features/setup/setup-complete.schema";
import { sendPasswordResetForUser } from "@/features/account/password-reset.service";

export type CustomerListRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
};

export const usersService = {
  async listCustomers(search?: string): Promise<CustomerListRow[]> {
    const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { city: { contains: q } },
      ];
    }
    return prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        createdAt: true,
      },
    });
  },

  async getCustomerById(id: string) {
    return prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        marketingOptIn: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async updateCustomer(id: string, raw: unknown) {
    const data = adminUpdateCustomerSchema.parse(raw);
    const update: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.dateOfBirth !== undefined) update.dateOfBirth = parseDateOfBirth(data.dateOfBirth);
    if (data.addressLine1 !== undefined) update.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) update.addressLine2 = emptyToNull(data.addressLine2);
    if (data.city !== undefined) update.city = data.city;
    if (data.state !== undefined) update.state = emptyToNull(data.state);
    if (data.postalCode !== undefined) update.postalCode = emptyToNull(data.postalCode);
    if (data.country !== undefined) update.country = data.country;
    if (data.marketingOptIn !== undefined) update.marketingOptIn = data.marketingOptIn;

    return prisma.user.update({
      where: { id, role: "CUSTOMER" },
      data: update,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
      },
    });
  },

  async setCustomerPassword(id: string, raw: unknown) {
    const { newPassword } = adminSetPasswordSchema.parse(raw);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return prisma.user.update({
      where: { id, role: "CUSTOMER" },
      data: { passwordHash },
      select: { id: true, email: true },
    });
  },

  async triggerPasswordReset(id: string, locale = "en") {
    await sendPasswordResetForUser(id, locale);
    return { ok: true as const };
  },
};
