import { test } from "node:test";
import assert from "node:assert/strict";
import { setupCompleteSchema, registerSchema } from "@/features/setup/setup-complete.schema";

test("setupCompleteSchema accepts valid payload", () => {
  const parsed = setupCompleteSchema.parse({
    siteName: "Acme Corp",
    adminEmail: "admin@example.com",
    adminPassword: "password12",
    registrationEnabled: true,
  });
  assert.equal(parsed.siteName, "Acme Corp");
});

test("registerSchema rejects short password", () => {
  assert.throws(() =>
    registerSchema.parse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "short",
      phone: "+966500000000",
      dateOfBirth: "1990-01-15",
      addressLine1: "123 Main St",
      city: "Riyadh",
      country: "Saudi Arabia",
    })
  );
});

test("registerSchema accepts full customer payload", () => {
  const parsed = registerSchema.parse({
    name: "Jane Doe",
    email: "jane@example.com",
    password: "password12",
    phone: "+966500000000",
    dateOfBirth: "1990-01-15",
    addressLine1: "123 Main St",
    city: "Riyadh",
    country: "Saudi Arabia",
    marketingOptIn: true,
  });
  assert.equal(parsed.email, "jane@example.com");
});

test("registerSchema rejects underage date of birth", () => {
  const recent = new Date();
  recent.setUTCFullYear(recent.getUTCFullYear() - 10);
  const iso = recent.toISOString().slice(0, 10);
  assert.throws(() =>
    registerSchema.parse({
      name: "Young User",
      email: "young@example.com",
      password: "password12",
      phone: "+966500000001",
      dateOfBirth: iso,
      addressLine1: "123 Main St",
      city: "Riyadh",
      country: "Saudi Arabia",
    })
  );
});
